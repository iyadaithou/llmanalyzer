import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/sessions/:id — full session transcript (session + windows + prompts + responses) */
export async function GET(_req, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const sb = await getSupabaseServerClient();

  const [sessionRes, windowsRes, promptsRes, responsesRes] = await Promise.all([
    sb.from("sessions").select("*").eq("id", id).single(),
    sb.from("chat_windows").select("*").eq("session_id", id).order("position"),
    sb.from("prompts").select("*").eq("session_id", id).order("turn_index"),
    sb
      .from("responses")
      .select("*")
      .in(
        "prompt_id",
        (
          await sb.from("prompts").select("id").eq("session_id", id)
        ).data?.map((p) => p.id) || ["00000000-0000-0000-0000-000000000000"],
      ),
  ]);

  if (sessionRes.error)
    return Response.json({ error: sessionRes.error.message }, { status: 404 });

  return Response.json({
    session: sessionRes.data,
    windows: windowsRes.data || [],
    prompts: promptsRes.data || [],
    responses: responsesRes.data || [],
  });
}

export async function PATCH(req, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const sb = await getSupabaseServerClient();

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
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const sb = await getSupabaseServerClient();
  const { error } = await sb.from("sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
