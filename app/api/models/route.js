import { CURATED_MODELS } from "@/lib/openrouter";

export const runtime = "edge";

export async function GET() {
  return Response.json({ models: CURATED_MODELS });
}
