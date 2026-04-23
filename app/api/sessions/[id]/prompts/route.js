import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/sessions/:id/prompts  { content } */
export async function POST(req, { params }) {
  const { id } = await params;
  const { content } = await req.json();
  if (!content) return new Response("content required", { status: 400 });

  const sb = getSupabaseServerClient();
  const { data: last } = await sb
    .from("prompts")
    .select("turn_index")
    .eq("session_id", id)
    .order("turn_index", { ascending: false })
    .limit(1);
  const turn_index = (last?.[0]?.turn_index ?? -1) + 1;

  const { data, error } = await sb
    .from("prompts")
    .insert({ session_id: id, content, turn_index })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await sb
    .from("sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return Response.json({ prompt: data });
}
