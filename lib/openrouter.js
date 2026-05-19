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
export const CURATED_MODELS = [
  // OpenAI / ChatGPT with Search
  { id: "openai/gpt-4o-mini-search-preview",   label: "ChatGPT Search (mini)", vendor: "OpenAI",     kind: "web", tier: "cheap",   note: "GPT-4o-mini + web search" },
  { id: "openai/gpt-4o-search-preview",        label: "ChatGPT Search",        vendor: "OpenAI",     kind: "web", tier: "premium", note: "GPT-4o + native web search" },

  // Anthropic / Claude with web
  { id: "anthropic/claude-sonnet-4.5:online",  label: "Claude Sonnet 4.5",     vendor: "Anthropic",  kind: "web", tier: "mid",     note: "Exa web search" },

  // Google / Gemini with web
  { id: "google/gemini-2.5-pro:online",        label: "Gemini 2.5 Pro",        vendor: "Google",     kind: "web", tier: "mid",     note: "Exa web search" },

  // Perplexity (natively web-connected)
  { id: "perplexity/sonar",                    label: "Perplexity Sonar",      vendor: "Perplexity", kind: "web", tier: "cheap",   note: "fast + cheap" },
  { id: "perplexity/sonar-pro",                label: "Perplexity Sonar Pro",  vendor: "Perplexity", kind: "web", tier: "mid",     note: "cites sources" },
  { id: "perplexity/sonar-reasoning-pro",      label: "Sonar Reasoning Pro",   vendor: "Perplexity", kind: "web", tier: "premium", note: "reasoning + web (verbose)" },

  // xAI / Grok with web
  { id: "x-ai/grok-4:online",                  label: "Grok 4",                vendor: "xAI",        kind: "web", tier: "premium", note: "Exa web search" },
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
 * OpenRouter's default is 5, billed at $4 per 1000 results. Dropping to 2
 * cuts that line item ~2.5x with negligible quality loss for most prompts.
 * Override per request via `max_search_results`.
 */
export const DEFAULT_MAX_SEARCH_RESULTS = 2;

/**
 * Default output cap. 512 is enough for a thoughtful comparative answer;
 * Perplexity reasoning models will happily fill any cap with thinking text
 * the user never reads, so keep this conservative.
 */
export const DEFAULT_MAX_TOKENS = 512;

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
