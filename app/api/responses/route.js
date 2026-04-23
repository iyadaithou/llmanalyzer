import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/responses
 * Body: { prompt_id, chat_window_id, model, content, latency_ms?, tokens_in?, tokens_out?, finish_reason?, error? }
 * Uses upsert on (prompt_id, chat_window_id) so we can re-run a single cell.
 */
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const body = await req.json();
  if (!body.prompt_id || !body.chat_window_id || !body.model)
    return new Response("missing fields", { status: 400 });

  const sb = await getSupabaseServerClient();
  const { data, error } = await sb
    .from("responses")
    .upsert(
      {
        user_id: userId,
        prompt_id: body.prompt_id,
        chat_window_id: body.chat_window_id,
        model: body.model,
        content: body.content ?? null,
        finish_reason: body.finish_reason ?? null,
        latency_ms: body.latency_ms ?? null,
        tokens_in: body.tokens_in ?? null,
        tokens_out: body.tokens_out ?? null,
        cost_usd: body.cost_usd ?? null,
        error: body.error ?? null,
      },
      { onConflict: "prompt_id,chat_window_id" },
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ response: data });
}
