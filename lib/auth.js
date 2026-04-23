// Tiny edge-compatible auth: single shared password -> HMAC-signed cookie.
// No users, no sessions table. Designed for a one-person research app.

export const COOKIE_NAME = "llma_auth";
export const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

function b64urlEncode(buf) {
  const s = typeof buf === "string" ? buf : String.fromCharCode(...new Uint8Array(buf));
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function b64urlDecode(s) {
  s = s.replaceAll("-", "+").replaceAll("_", "/");
  while (s.length % 4) s += "=";
  return atob(s);
}
function hex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSecret() {
  // Prefer dedicated secret; fall back to the password itself (good enough for a
  // single-user app, but APP_AUTH_SECRET is recommended in production).
  return process.env.APP_AUTH_SECRET || process.env.APP_PASSWORD || "";
}

async function hmac(data) {
  const secret = getSecret();
  if (!secret) throw new Error("APP_AUTH_SECRET / APP_PASSWORD is not set");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return hex(sig);
}

/** Timing-safe-ish comparison (hex strings). */
function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Issue a signed token with expiry. */
export async function issueToken(ttlSeconds = COOKIE_MAX_AGE_S) {
  const payload = { exp: Date.now() + ttlSeconds * 1000, v: 1 };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/** Verify a token. Returns true if signature valid and not expired. */
export async function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = await hmac(body);
  if (!safeEq(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(b64urlDecode(body));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Check a submitted password against the configured one. */
export function isCorrectPassword(input) {
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) return false;
  if (typeof input !== "string" || input.length !== expected.length) {
    // Still do a dummy compare to avoid super-trivial timing leaks.
    let r = 0;
    const a = String(input || "");
    for (let i = 0; i < Math.max(a.length, expected.length); i++) {
      r |= (a.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
    }
    return false;
  }
  let r = 0;
  for (let i = 0; i < expected.length; i++) {
    r |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return r === 0;
}
