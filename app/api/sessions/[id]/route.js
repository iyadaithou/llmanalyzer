import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/sessions/:id — full transcript */
export async function GET(_req, { params }) {
  const { id } = await params;
  const sb = getSupabaseServerClient();

  const [sessionRes, windowsRes, promptsRes] = await Promise.all([
    sb.from("sessions").select("*").eq("id", id).single(),
    sb.from("chat_windows").select("*").eq("session_id", id).order("position"),
    sb.from("prompts").select("*").eq("session_id", id).order("turn_index"),
  ]);

  if (sessionRes.error)
    return Response.json({ error: sessionRes.error.message }, { status: 404 });

  const promptIds = (promptsRes.data || []).map((p) => p.id);
  const { data: responses } = promptIds.length
    ? await sb.from("responses").select("*").in("prompt_id", promptIds)
    : { data: [] };

  return Response.json({
    session: sessionRes.data,
    windows: windowsRes.data || [],
    prompts: promptsRes.data || [],
    responses: responses || [],
  });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const sb = getSupabaseServerClient();

  const updates = {};
  for (const k of [
    "name",
    "folder_id",
    "multi_turn",
    "system_prompt",
    "temperature",
    "max_tokens",
  ]) {
    if (k in body) updates[k] = body[k];
  }

  const { data, error } = await sb
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
