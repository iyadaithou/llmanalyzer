import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
