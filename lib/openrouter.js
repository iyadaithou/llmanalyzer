const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Flagship-only lineup for studying *search behavior* across vendors.
 *
 * Cheap variants (mini / haiku / flash) are intentionally excluded so brain
 * size doesn't confound the comparison — the only thing that should differ
 * between two windows is how the vendor's model uses the web.
 *
 * Search pipeline split:
 *   - 4 models use OpenRouter's Exa-via-`:online` plugin (OpenAI / Anthropic
 *     / Google / xAI). Same Exa instance, capped at DEFAULT_MAX_SEARCH_RESULTS.
 *   - 3 Perplexity Sonar models use Perplexity's own first-party search,
 *     not Exa. That's not a bug — Perplexity's distinctive feature *is* its
 *     search, so swapping it for Exa would defeat the point of including it.
 *
 * `tier` is a rough cost band ("cheap" / "mid" / "premium") used for future
 * budget tooling. Not surfaced in the UI.
 *
 * NOTE: `perplexity/sonar-deep-research` is intentionally excluded — it's
 * an agentic tool that costs $0.30-$2.00 per call, wrong shape for a parallel
 * fan-out playground.
 */
export const CURATED_MODELS = [
  // OpenAI — Exa via :online (we dropped gpt-4o-*-search-preview because
  // OpenAI's native search charges $0.0275-0.035/request, which makes them
  // the most expensive AND least mechanism-consistent option in the catalog).
  { id: "openai/gpt-5:online",                 label: "GPT-5",                 vendor: "OpenAI",     kind: "web", tier: "premium", note: "GPT-5 + Exa web" },

  // Anthropic / Claude with Exa web
  { id: "anthropic/claude-sonnet-4.5:online",  label: "Claude Sonnet 4.5",     vendor: "Anthropic",  kind: "web", tier: "mid",     note: "Exa web search" },

  // Google / Gemini with Exa web
  { id: "google/gemini-2.5-pro:online",        label: "Gemini 2.5 Pro",        vendor: "Google",     kind: "web", tier: "mid",     note: "Exa web search" },

  // xAI / Grok with Exa web. Note: `x-ai/grok-4` is listed in OpenRouter's
  // catalog but currently has zero live endpoints — every request to it
  // hangs / returns empty. `grok-4.3` is the current shipping flagship.
  { id: "x-ai/grok-4.3:online",                label: "Grok 4.3",              vendor: "xAI",        kind: "web", tier: "premium", note: "Exa web search" },

  // Perplexity (natively web-connected; $0.005/request — cheapest search of
  // any provider as of 2026-05). Three variants cover the spectrum:
  // base / pro / reasoning-pro.
  { id: "perplexity/sonar",                    label: "Perplexity Sonar",      vendor: "Perplexity", kind: "web", tier: "cheap",   note: "fast + cheap" },
  { id: "perplexity/sonar-pro",                label: "Perplexity Sonar Pro",  vendor: "Perplexity", kind: "web", tier: "mid",     note: "cites sources" },
  { id: "perplexity/sonar-reasoning-pro",      label: "Sonar Reasoning Pro",   vendor: "Perplexity", kind: "web", tier: "premium", note: "reasoning + web (verbose)" },
];

export function openRouterHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME || "LLM Analyzer",
  };
}

/**
 * Default cap on Exa web-search results for `:online` models.
 * OpenRouter's default is 5, billed at $4 per 1000 results. Dropping to 3
 * trims that line item ~40% while still giving the model enough sources
 * to triangulate. Override per request via `max_search_results`.
 */
export const DEFAULT_MAX_SEARCH_RESULTS = 3;

/**
 * Hard cap on the *thinking* portion of the output budget for reasoning
 * models that accept a token budget (Gemini 2.5 Pro, Anthropic with thinking,
 * sonar-reasoning-pro). For non-reasoning models OpenRouter ignores this.
 *
 * NOTE: OpenAI's o-series and gpt-5 do *not* accept a token budget for
 * reasoning — only an `effort` level. They are configured separately below
 * via OPENAI_REASONING_EFFORT.
 */
export const DEFAULT_REASONING_MAX_TOKENS = 512;

/**
 * Reasoning effort for OpenAI o-series and gpt-5.
 *
 *   minimal — barely any reasoning, fastest, weaker on hard prompts
 *   low     — short reasoning, good balance for research
 *   medium  — OpenAI's default; can burn 1000-2000 tokens thinking
 *   high    — deep reasoning, slow, expensive, often hits max_completion_tokens
 *
 * "low" is the right default for this app: we're studying how models *use*
 * web search to answer, not how deep they can reason. With "low" effort and
 * the larger budget below, GPT-5 reliably produces a visible answer instead
 * of timing out at finish_reason=length with empty content.
 */
export const OPENAI_REASONING_EFFORT = "low";

/**
 * Floor on max_completion_tokens for OpenAI reasoning models. OpenAI's
 * `max_completion_tokens` parameter is the *total* budget — reasoning tokens
 * + visible content tokens both come out of this pool.
 *
 * History: started at 2048 (Gemini-style), bumped to 4096 (still hit
 * finish_reason=length on web-grounded research prompts), now 8192. For
 * complex prompts with web search results, GPT-5 at even "low" effort can
 * legitimately spend 2000-3000 tokens reasoning about all the sources
 * before answering. 8192 leaves ~5000-6000 for the visible answer in the
 * worst case, which is plenty.
 *
 * Cost note: max_completion_tokens is a *cap*, not a target. The model
 * still stops when it's done. Typical research prompt with low effort runs
 * ~1500 reasoning + ~600-1500 visible = under 3000 total. The 8192 cap
 * just buys headroom for the rare hard prompt.
 */
export const OPENAI_REASONING_MIN_BUDGET = 8192;

/**
 * Default output cap.
 *
 * History:
 *   512  — too aggressive, cut Gemini 2.5 Pro mid-sentence (its hidden
 *          thinking phase ate most of the budget before any visible token).
 *   1024 — still cut on some prompts (deep thinking + long answer >1k).
 *   2048 — current. Generous enough that:
 *            * thorough research answers (~600-1000 visible tokens) finish.
 *            * thinking models (Gemini 2.5 Pro, sonar-reasoning-pro) have
 *              ~1k for thinking *and* ~1k for the visible answer.
 *
 * Cost impact: still near-zero for non-thinking models since they stop
 * when they're done regardless of the cap. Only thinking / verbose models
 * actually use the extra room, which is the entire point. Worst case at
 * 6 windows × 2048 output × ~$5/M avg ≈ $0.06 per turn. Cheap.
 */
export const DEFAULT_MAX_TOKENS = 2048;

/**
 * OpenAI reasoning-family models (o-series and gpt-5*) reject two things
 * that the rest of the catalog accepts:
 *   - `temperature` other than the default 1.0 → returns 400 from OpenAI,
 *     or gets silently dropped by some Azure endpoints. This was the actual
 *     cause of "GPT-5 returns no answer" — every request was being rejected
 *     because we send `temperature: 0.7` from the session settings.
 *   - `max_tokens` on Azure routes; those endpoints want
 *     `max_completion_tokens` instead.
 *
 * Detect these models and build a conforming payload for them.
 */
function isOpenAIReasoningModel(modelId) {
  if (!modelId) return false;
  const base = String(modelId).split(":")[0].toLowerCase();
  if (!base.startsWith("openai/")) return false;
  const family = base.slice("openai/".length);
  // o1, o3, o4-mini, o4-mini-deep-research, ... and the entire gpt-5 line
  return /^o\d/.test(family) || /^gpt-5/.test(family);
}

export async function openRouterStream({
  model,
  messages,
  temperature,
  max_tokens,
  max_search_results,
  signal,
}) {
  const cap = max_tokens ?? DEFAULT_MAX_TOKENS;
  const reasoningOnly = isOpenAIReasoningModel(model);

  const body = {
    model,
    messages,
    stream: true,
    // Cap Exa search depth for `:online` models. Ignored by providers that
    // do their own search (OpenAI search-preview, Perplexity Sonar) — safe
    // to send unconditionally.
    plugins: [
      {
        id: "web",
        max_results: max_search_results ?? DEFAULT_MAX_SEARCH_RESULTS,
      },
    ],
  };

  if (reasoningOnly) {
    // OpenAI gpt-5 / o-series quirks:
    //   * Reject `temperature` — model runs at fixed 1.0, anything else 400s.
    //   * Need `max_completion_tokens` (not `max_tokens`) on Azure routes.
    //   * `max_completion_tokens` is the *total* budget: reasoning tokens
    //     + visible output share it. Floor at OPENAI_REASONING_MIN_BUDGET so
    //     the visible answer doesn't get starved out.
    //   * Use `reasoning.effort` (their actual API) instead of
    //     `reasoning.max_tokens` (which OpenAI doesn't honor).
    body.max_completion_tokens = Math.max(cap, OPENAI_REASONING_MIN_BUDGET);
    body.reasoning = {
      effort: OPENAI_REASONING_EFFORT,
      exclude: false,
    };
  } else {
    body.temperature = temperature ?? 0.7;
    body.max_tokens = cap;
    // Bound thinking budget for providers that accept a token cap (Gemini,
    // Anthropic with thinking, sonar-reasoning-pro). Ignored otherwise.
    body.reasoning = {
      max_tokens: DEFAULT_REASONING_MAX_TOKENS,
      exclude: false,
    };
  }

  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
    signal,
  });
}
