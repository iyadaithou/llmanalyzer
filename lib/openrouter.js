const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Curated list of models we expose in the UI.
 *
 * Philosophy: these are the models consumer products actually deploy to end
 * users (as of early 2026). When there's a "live" / web-connected variant
 * that end users experience (e.g. ChatGPT with Search, Gemini with grounding,
 * Perplexity), we include it so researchers can compare like-for-like.
 *
 * Fields:
 *   id      — OpenRouter model id (https://openrouter.ai/models)
 *   label   — short display name (what a researcher sees in the picker)
 *   vendor  — the company
 *   kind    — "standard" | "web" | "reasoning"
 *   note    — optional sub-label shown in tiny text
 */
export const CURATED_MODELS = [
  // ---------- OpenAI / ChatGPT ----------
  { id: "openai/gpt-4o",                       label: "ChatGPT (GPT-4o)",        vendor: "OpenAI",    kind: "standard" },
  { id: "openai/gpt-4o-mini",                  label: "ChatGPT mini (GPT-4o-mini)", vendor: "OpenAI", kind: "standard" },
  { id: "openai/gpt-4.1",                      label: "GPT-4.1",                 vendor: "OpenAI",    kind: "standard" },
  { id: "openai/o3-mini",                      label: "o3-mini (reasoning)",     vendor: "OpenAI",    kind: "reasoning" },
  { id: "openai/gpt-4o-search-preview",        label: "ChatGPT Search",          vendor: "OpenAI",    kind: "web", note: "native web search" },
  { id: "openai/gpt-4o-mini-search-preview",   label: "ChatGPT Search (mini)",   vendor: "OpenAI",    kind: "web", note: "native web search" },

  // ---------- Anthropic / Claude ----------
  { id: "anthropic/claude-sonnet-4.5",         label: "Claude Sonnet 4.5",       vendor: "Anthropic", kind: "standard" },
  { id: "anthropic/claude-opus-4.1",           label: "Claude Opus 4.1",         vendor: "Anthropic", kind: "standard" },
  { id: "anthropic/claude-3.5-haiku",          label: "Claude 3.5 Haiku",        vendor: "Anthropic", kind: "standard" },
  { id: "anthropic/claude-sonnet-4.5:online",  label: "Claude Sonnet 4.5 + Web", vendor: "Anthropic", kind: "web", note: "Exa web search" },

  // ---------- Google / Gemini ----------
  { id: "google/gemini-2.5-pro",               label: "Gemini 2.5 Pro",          vendor: "Google",    kind: "standard" },
  { id: "google/gemini-2.5-flash",             label: "Gemini 2.5 Flash",        vendor: "Google",    kind: "standard" },
  { id: "google/gemini-2.5-pro:online",        label: "Gemini 2.5 Pro + Web",    vendor: "Google",    kind: "web", note: "Exa web search" },

  // ---------- Perplexity (natively web-connected) ----------
  { id: "perplexity/sonar-pro",                label: "Perplexity Sonar Pro",    vendor: "Perplexity", kind: "web", note: "cites sources" },
  { id: "perplexity/sonar",                    label: "Perplexity Sonar",        vendor: "Perplexity", kind: "web", note: "fast + cheap" },
  { id: "perplexity/sonar-reasoning-pro",      label: "Sonar Reasoning Pro",     vendor: "Perplexity", kind: "web", note: "reasoning + web" },
  { id: "perplexity/sonar-deep-research",      label: "Sonar Deep Research",     vendor: "Perplexity", kind: "web", note: "slow, thorough" },

  // ---------- xAI / Grok ----------
  { id: "x-ai/grok-4",                         label: "Grok 4",                  vendor: "xAI",       kind: "standard" },
  { id: "x-ai/grok-4:online",                  label: "Grok 4 + Web",            vendor: "xAI",       kind: "web", note: "Exa web search" },

  // ---------- Open source ----------
  { id: "meta-llama/llama-3.3-70b-instruct",   label: "Llama 3.3 70B",           vendor: "Meta",      kind: "standard" },
  { id: "mistralai/mistral-large",             label: "Mistral Large",           vendor: "Mistral",   kind: "standard" },
  { id: "deepseek/deepseek-chat",              label: "DeepSeek Chat",           vendor: "DeepSeek",  kind: "standard" },
  { id: "deepseek/deepseek-r1",                label: "DeepSeek R1",             vendor: "DeepSeek",  kind: "reasoning" },
  { id: "qwen/qwen-2.5-72b-instruct",          label: "Qwen 2.5 72B",            vendor: "Alibaba",   kind: "standard" },
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
