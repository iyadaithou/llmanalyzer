const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Curated list of models we expose in the UI.
 * Keep this trimmed — adding every model makes the picker useless.
 * Model ids are OpenRouter identifiers: https://openrouter.ai/models
 */
export const CURATED_MODELS = [
  { id: "openai/gpt-4o",                     label: "GPT-4o",               vendor: "OpenAI" },
  { id: "openai/gpt-4o-mini",                label: "GPT-4o mini",          vendor: "OpenAI" },
  { id: "openai/gpt-4.1",                    label: "GPT-4.1",              vendor: "OpenAI" },
  { id: "openai/o3-mini",                    label: "o3-mini",              vendor: "OpenAI" },
  { id: "anthropic/claude-sonnet-4.5",       label: "Claude Sonnet 4.5",    vendor: "Anthropic" },
  { id: "anthropic/claude-opus-4.1",         label: "Claude Opus 4.1",      vendor: "Anthropic" },
  { id: "anthropic/claude-3.5-haiku",        label: "Claude 3.5 Haiku",     vendor: "Anthropic" },
  { id: "google/gemini-2.5-pro",             label: "Gemini 2.5 Pro",       vendor: "Google" },
  { id: "google/gemini-2.5-flash",           label: "Gemini 2.5 Flash",     vendor: "Google" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B",        vendor: "Meta" },
  { id: "mistralai/mistral-large",           label: "Mistral Large",        vendor: "Mistral" },
  { id: "x-ai/grok-4",                       label: "Grok 4",               vendor: "xAI" },
  { id: "deepseek/deepseek-chat",            label: "DeepSeek Chat",        vendor: "DeepSeek" },
  { id: "deepseek/deepseek-r1",              label: "DeepSeek R1",          vendor: "DeepSeek" },
  { id: "qwen/qwen-2.5-72b-instruct",        label: "Qwen 2.5 72B",         vendor: "Alibaba" },
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
 * Call OpenRouter with streaming enabled. Returns the raw fetch response.
 * Body is a regular OpenAI-compatible chat completion request.
 */
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
