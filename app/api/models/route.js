import { CURATED_MODELS } from "@/lib/openrouter";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  return Response.json({ models: CURATED_MODELS });
}
