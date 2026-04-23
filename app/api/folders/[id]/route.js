import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("folders")
    .update({ name: body.name })
    .eq("id", id)
    .select("id, name")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ folder: data });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("folders").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
