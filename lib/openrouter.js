const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Curated list of models we expose in the UI.
 *
 * We only expose web-connected / live variants — these are the closest
 * approximation to what end users experience in consumer products
 * (ChatGPT with Search, Claude with web, Gemini with grounding,
 * Perplexity, Grok with web). Raw offline API models are intentionally
 * excluded to keep the comparison apples-to-apples.
 *
 * `tier` is a rough cost band used by the UI (and to warn the user before
 * fanning out a prompt to expensive models):
 *   cheap   — typically <$0.01 per prompt
 *   mid     — typically $0.01 - $0.04 per prompt
 *   premium — can exceed $0.05 per prompt; some bake big reasoning traces
 *             into the output token bill
 *
 * NOTE: `perplexity/sonar-deep-research` is intentionally excluded. It is an
 * agentic deep-research tool that runs many internal searches per query and
 * routinely costs $0.30 - $2.00 per call — wrong shape for a parallel
 * fan-out playground. Re-add it behind an explicit "deep research" button if
 * needed.
 */
/**
 * Flagship-only lineup for studying *search behavior* across vendors. Cheap
 * variants (mini / haiku / flash) are intentionally excluded so brain size
 * doesn't confound the comparison — the only thing that should differ
 * between two windows is how the vendor's model uses the web.
 *
 * Search pipeline split:
 *   - 4 models use OpenRouter's Exa-via-`:online` plugin (OpenAI / Anthropic
 *     / Google / xAI). Same Exa instance, capped at DEFAULT_MAX_SEARCH_RESULTS.
 *   - 3 Perplexity Sonar models use Perplexity's own first-party search,
 *     not Exa. That's not a bug — Perplexity's distinctive feature *is* its
 *     search, so swapping it for Exa would defeat the point of including it.
 *
 *  So: 4 Exa-augmented frontier models + 3 native-search Perplexity variants.
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

  // xAI / Grok with Exa web
  { id: "x-ai/grok-4:online",                  label: "Grok 4",                vendor: "xAI",        kind: "web", tier: "premium", note: "Exa web search" },

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
 * Default output cap. We previously had this at 512 but that's hostile to
 * thinking models — Gemini 2.5 Pro and sonar-reasoning-pro silently consume
 * budget on hidden internal reasoning *before* producing visible content,
 * so 512 left them ~100-150 tokens for the actual answer and they cut off
 * mid-sentence. 1024 gives ~400-600 for thinking plus a full answer.
 *
 * Cost impact of 512 -> 1024 is near-zero: non-thinking models stop when
 * they're done regardless of the cap. Only the (already premium-tier)
 * thinking models actually use the extra room, and that's the whole point.
 */
export const DEFAULT_MAX_TOKENS = 1024;

export async function openRouterStream({
  model,
  messages,
  temperature,
  max_tokens,
  max_search_results,
  signal,
}) {
  const body = {
    model,
    messages,
    temperature: temperature ?? 0.7,
    max_tokens: max_tokens ?? DEFAULT_MAX_TOKENS,
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

  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
    signal,
  });
}
