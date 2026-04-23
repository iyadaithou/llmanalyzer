import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CURATED_MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

/** POST /api/sessions/:id/windows  { model } */
export async function POST(req, { params }) {
  const { id } = await params;
  const { model } = await req.json();
  if (!model) return new Response("model required", { status: 400 });

  const sb = getSupabaseServerClient();
  const { data: existing } = await sb
    .from("chat_windows")
    .select("position")
    .eq("session_id", id)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("chat_windows")
    .insert({
      session_id: id,
      model,
      label: CURATED_MODELS.find((m) => m.id === model)?.label || model,
      position: nextPos,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ window: data });
}
