export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * GET /api/credits
 * Proxies OpenRouter's /credits endpoint so we don't leak the API key
 * to the browser. Returns { total, used, remaining }.
 */
export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return Response.json(
      { error: "OPENROUTER_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text();
      return Response.json(
        { error: `OpenRouter ${r.status}: ${text.slice(0, 200)}` },
        { status: r.status },
      );
    }
    const j = await r.json();
    const total = Number(j?.data?.total_credits ?? 0);
    const used = Number(j?.data?.total_usage ?? 0);
    return Response.json({
      total,
      used,
      remaining: Math.max(0, total - used),
    });
  } catch (e) {
    return Response.json(
      { error: e?.message || "failed to fetch credits" },
      { status: 500 },
    );
  }
}
