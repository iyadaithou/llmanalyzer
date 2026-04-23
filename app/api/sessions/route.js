import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CURATED_MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

/** GET /api/sessions — list all sessions */
export async function GET() {
  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("sessions")
    .select("id, name, folder_id, multi_turn, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}

/**
 * POST /api/sessions
 * Body: { name?, folder_id?, multi_turn?, system_prompt?, temperature?, max_tokens?, models? }
 * Creates a session plus one chat_window per model.
 */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  const sb = getSupabaseServerClient();

  const { data: session, error: sErr } = await sb
    .from("sessions")
    .insert({
      name: body.name || "New session",
      folder_id: body.folder_id ?? null,
      multi_turn: body.multi_turn ?? true,
      system_prompt: body.system_prompt ?? null,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1024,
    })
    .select()
    .single();
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  const defaultModels = [
    "openai/gpt-4o-mini",
    "anthropic/claude-sonnet-4.5",
    "google/gemini-2.5-flash",
  ];
  const models = Array.isArray(body.models) && body.models.length
    ? body.models
    : defaultModels;

  const windowRows = models.map((model, i) => ({
    session_id: session.id,
    model,
    label: CURATED_MODELS.find((m) => m.id === model)?.label || model,
    position: i,
  }));

  const { data: windows, error: wErr } = await sb
    .from("chat_windows")
    .insert(windowRows)
    .select();
  if (wErr) return Response.json({ error: wErr.message }, { status: 500 });

  return Response.json({ session, windows });
}
