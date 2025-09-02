import type { NextRequest } from "next/server";

export const runtime = "edge"; // lower latency & great for streaming

export async function POST(req: NextRequest) {
  try {
    const { message, timezone, now } = await req.json();

    const tz =
      typeof timezone === "string" && timezone.length > 0
        ? timezone
        : "Pacific/Auckland";

    const nowDate = now ? new Date(now) : new Date();
    const nowStr = nowDate.toLocaleString("en-NZ", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server is missing OPENAI_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI with streaming on
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              `You are Nexa Scenario, a fast, helpful AI assistant. ` +
              `The user's local time is ${nowStr} in time zone "${tz}". ` +
              `When asked about date/day/time, use that local clock.`,
          },
          { role: "user", content: String(message ?? "") },
        ],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: `OpenAI error ${upstream.status}`,
          details: errText,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Proxy OpenAI's SSE stream straight to the client.
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value); // pass through chunks unchanged (SSE "data:" lines)
          }
        } catch (err) {
          controller.error(err);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // (same-origin; no CORS header needed)
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(e?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
