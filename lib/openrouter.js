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
 * Fields:
 *   id      — OpenRouter model id (https://openrouter.ai/models)
 *   label   — short display name
 *   vendor  — company
 *   kind    — always "web" here (kept for future extensibility)
 *   note    — optional sub-label
 */
export const CURATED_MODELS = [
  // OpenAI / ChatGPT with Search
  { id: "openai/gpt-4o-search-preview",        label: "ChatGPT Search",        vendor: "OpenAI",     kind: "web", note: "GPT-4o + native web search" },
  { id: "openai/gpt-4o-mini-search-preview",   label: "ChatGPT Search (mini)", vendor: "OpenAI",     kind: "web", note: "GPT-4o-mini + web search" },

  // Anthropic / Claude with web
  { id: "anthropic/claude-sonnet-4.5:online",  label: "Claude Sonnet 4.5",     vendor: "Anthropic",  kind: "web", note: "Exa web search" },

  // Google / Gemini with web
  { id: "google/gemini-2.5-pro:online",        label: "Gemini 2.5 Pro",        vendor: "Google",     kind: "web", note: "Exa web search" },

  // Perplexity (natively web-connected)
  { id: "perplexity/sonar-pro",                label: "Perplexity Sonar Pro",  vendor: "Perplexity", kind: "web", note: "cites sources" },
  { id: "perplexity/sonar",                    label: "Perplexity Sonar",      vendor: "Perplexity", kind: "web", note: "fast + cheap" },
  { id: "perplexity/sonar-reasoning-pro",      label: "Sonar Reasoning Pro",   vendor: "Perplexity", kind: "web", note: "reasoning + web" },
  { id: "perplexity/sonar-deep-research",      label: "Sonar Deep Research",   vendor: "Perplexity", kind: "web", note: "slow, thorough" },

  // xAI / Grok with web
  { id: "x-ai/grok-4:online",                  label: "Grok 4",                vendor: "xAI",        kind: "web", note: "Exa web search" },
];

export function openRouterHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME || "LLM Analyzer",
  };
}

export async function openRouterStream({ model, messages, temperature, max_tokens, signal }) {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1024,
      stream: true,
    }),
    signal,
  });
}
