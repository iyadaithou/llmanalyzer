import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** PATCH /api/responses/:id  { rating?, notes? } */
export async function PATCH(req, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updates = {};
  if ("rating" in body) updates.rating = body.rating;
  if ("notes" in body) updates.notes = body.notes;

  const sb = await getSupabaseServerClient();
  const { data, error } = await sb
    .from("responses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ response: data });
}
