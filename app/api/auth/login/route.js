import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_S,
  isCorrectPassword,
  issueToken,
} from "@/lib/auth";

export const runtime = "edge";

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const password = body?.password;

  if (!isCorrectPassword(password)) {
    // Small delay to blunt brute-force attempts a little.
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const token = await issueToken();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
  return Response.json({ ok: true });
}
