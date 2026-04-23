import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/sessions/:id/export?format=json|csv */
export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const sb = getSupabaseServerClient();
  const { data: session } = await sb.from("sessions").select("*").eq("id", id).single();
  if (!session) return new Response("not found", { status: 404 });

  const [{ data: windows }, { data: prompts }] = await Promise.all([
    sb.from("chat_windows").select("*").eq("session_id", id).order("position"),
    sb.from("prompts").select("*").eq("session_id", id).order("turn_index"),
  ]);

  const promptIds = (prompts || []).map((p) => p.id);
  const { data: responses } = promptIds.length
    ? await sb.from("responses").select("*").in("prompt_id", promptIds)
    : { data: [] };

  if (format === "csv") {
    const rows = [
      [
        "session_name",
        "turn",
        "prompt",
        "window_label",
        "model",
        "response",
        "latency_ms",
        "tokens_in",
        "tokens_out",
        "rating",
        "notes",
        "finish_reason",
        "error",
      ],
    ];
    for (const p of prompts || []) {
      for (const w of windows || []) {
        const r = responses?.find(
          (x) => x.prompt_id === p.id && x.chat_window_id === w.id,
        );
        rows.push([
          session.name,
          p.turn_index,
          p.content,
          w.label || w.model,
          w.model,
          r?.content ?? "",
          r?.latency_ms ?? "",
          r?.tokens_in ?? "",
          r?.tokens_out ?? "",
          r?.rating ?? "",
          r?.notes ?? "",
          r?.finish_reason ?? "",
          r?.error ?? "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName(session.name)}.csv"`,
      },
    });
  }

  const body = JSON.stringify(
    { session, windows, prompts, responses },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName(session.name)}.json"`,
    },
  });
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}
function safeName(s) {
  return (s || "session").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}
