/**
 * Pure-JS markdown generators used for in-browser downloads.
 * No server / fs imports — safe to use from client components.
 */

export function safeFilename(s) {
  return (s || "session").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
}

function modelLabel(w, models) {
  const meta = models?.find((m) => m.id === w.model);
  if (!meta) return w.model;
  const web = meta.kind === "web" ? " [WEB]" : "";
  return `${meta.label} (${w.model})${web}`;
}

function ratingStars(n) {
  if (!n) return "";
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return `${full}${empty}`;
}

function metricsLine(r) {
  if (!r) return "";
  const parts = [];
  if (r.latency_ms != null) parts.push(`${r.latency_ms} ms`);
  if (r.tokens_in != null) parts.push(`in: ${r.tokens_in}`);
  if (r.tokens_out != null) parts.push(`out: ${r.tokens_out}`);
  if (r.finish_reason) parts.push(`finish: ${r.finish_reason}`);
  return parts.length ? `_${parts.join(" · ")}_` : "";
}

/** Markdown for one chat window (one model) across all turns. */
export function windowToMarkdown({ session, window: w, turns, models }) {
  const lines = [];
  lines.push(`# ${session.name}`);
  lines.push(`**Model:** ${modelLabel(w, models)}`);
  lines.push(`**Exported:** ${new Date().toISOString()}`);
  lines.push("");
  if (session.system_prompt) {
    lines.push(`> **System prompt:** ${session.system_prompt}`);
    lines.push("");
  }
  lines.push(
    `> Multi-turn: ${session.multi_turn ? "yes" : "no"} · temperature: ${
      session.temperature ?? 0.7
    } · max_tokens: ${session.max_tokens ?? 1024}`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  turns.forEach((t, i) => {
    lines.push(`## Turn ${i + 1}`);
    lines.push("");
    lines.push("**Prompt**");
    lines.push("");
    lines.push(t.prompt?.content || "_(empty)_");
    lines.push("");
    lines.push("**Response**");
    lines.push("");
    if (t.response?.error) {
      lines.push(`> ⚠ error: ${t.response.error}`);
    } else {
      lines.push(t.response?.content || "_(no response)_");
    }
    lines.push("");
    const m = metricsLine(t.response);
    if (m) lines.push(m);
    if (t.response?.rating) lines.push(`_rating: ${ratingStars(t.response.rating)}_`);
    if (t.response?.notes) {
      lines.push("");
      lines.push(`**Notes:** ${t.response.notes}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/** Markdown for the whole session: each turn shows every model's answer side-by-side. */
export function sessionToMarkdown({ session, windows, prompts, responses, models }) {
  const lines = [];
  lines.push(`# ${session.name}`);
  lines.push(`**Exported:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Settings");
  lines.push(`- Multi-turn: ${session.multi_turn ? "yes" : "no"}`);
  lines.push(`- Temperature: ${session.temperature ?? 0.7}`);
  lines.push(`- Max tokens: ${session.max_tokens ?? 1024}`);
  if (session.system_prompt) {
    lines.push(`- System prompt: ${session.system_prompt}`);
  }
  lines.push("");
  lines.push("## Models");
  windows.forEach((w) => lines.push(`- ${modelLabel(w, models)}`));
  lines.push("");
  lines.push("---");
  lines.push("");

  prompts.forEach((p, i) => {
    const excerpt = (p.content || "").slice(0, 60).replace(/\s+/g, " ");
    lines.push(`## Turn ${i + 1} — ${excerpt}${p.content?.length > 60 ? "…" : ""}`);
    lines.push("");
    lines.push("**Prompt**");
    lines.push("");
    lines.push(p.content || "_(empty)_");
    lines.push("");

    windows.forEach((w) => {
      const r = responses.find(
        (x) => x.prompt_id === p.id && x.chat_window_id === w.id,
      );
      lines.push(`### ${modelLabel(w, models)}`);
      lines.push("");
      if (r?.error) {
        lines.push(`> ⚠ error: ${r.error}`);
      } else {
        lines.push(r?.content || "_(no response)_");
      }
      lines.push("");
      const m = metricsLine(r);
      if (m) lines.push(m);
      if (r?.rating) lines.push(`_rating: ${ratingStars(r.rating)}_`);
      if (r?.notes) {
        lines.push("");
        lines.push(`**Notes:** ${r.notes}`);
      }
      lines.push("");
    });

    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/** Browser-only: trigger a file download from a string. */
export function downloadText(filename, text, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
