import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CURATED_MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const sb = getSupabaseServerClient();

  const updates = {};
  if ("model" in body) {
    updates.model = body.model;
    updates.label =
      CURATED_MODELS.find((m) => m.id === body.model)?.label || body.model;
  }
  if ("label" in body) updates.label = body.label;

  const { data, error } = await sb
    .from("chat_windows")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ window: data });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("chat_windows").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
