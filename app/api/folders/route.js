import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("folders")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ folders: data });
}

export async function POST(req) {
  const { name } = await req.json();
  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("folders")
    .insert({ name: name || "New folder" })
    .select("id, name, created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ folder: data });
}
