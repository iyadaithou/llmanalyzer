import { openRouterStream } from "@/lib/openrouter";

export const runtime = "edge";
export const maxDuration = 300;

/**
 * POST /api/chat
 * Body: { model, messages, temperature?, max_tokens? }
 *
 * Returns a Server-Sent Events stream. Each "data: {...}" line contains either:
 *   { delta: "partial text" }
 *   { done: true, usage?: {...}, finish_reason?: "..." }
 *   { error: "..." }
 *
 * The client calls this once per chat window in parallel.
 * Auth gate is handled by middleware.js.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const { model, messages, temperature, max_tokens } = body || {};
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Missing model or messages", { status: 400 });
  }

  const upstream = await openRouterStream({
    model,
    messages,
    temperature,
    max_tokens,
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      `data: ${JSON.stringify({ error: text || `Upstream ${upstream.status}` })}\n\n`,
      {
        status: 200,
        headers: sseHeaders(),
      },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = "";
      let usage = null;
      let finishReason = null;

      const send = (obj) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              send({ done: true, usage, finish_reason: finishReason });
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const choice = json.choices?.[0];
              const deltaText =
                choice?.delta?.content ??
                choice?.delta?.reasoning ??
                "";
              if (deltaText) send({ delta: deltaText });
              if (choice?.finish_reason) finishReason = choice.finish_reason;
              if (json.usage) usage = json.usage;
            } catch {
              // ignore malformed keep-alives
            }
          }
        }
        send({ done: true, usage, finish_reason: finishReason });
        controller.close();
      } catch (err) {
        send({ error: err?.message || "stream error" });
        try { controller.close(); } catch {}
      }
    },
    cancel() {
      try { upstream.body?.cancel?.(); } catch {}
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
