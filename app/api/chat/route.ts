import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, timezone, now } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // Use client-provided timezone & timestamp when available; fall back to NZ
    const tz =
      typeof timezone === "string" && timezone.length > 0
        ? timezone
        : "Pacific/Auckland";

    const nowDate = now ? new Date(now) : new Date();
    // Format a friendly, unambiguous string for the system prompt
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

    const messages = [
      {
        role: "system",
        content:
          `You are Nexa Scenario, a fast, helpful AI assistant. ` +
          `The user's local time is ${nowStr} in time zone "${tz}". ` +
          `Whenever asked about date, day, or time, use that local clock. ` +
          `If the user references "today", "tomorrow", etc., interpret relative to this local time.`,
      },
      { role: "user", content: String(message ?? "") },
    ];

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json(
        { error: `OpenAI error ${apiRes.status}`, details: errText },
        { status: 500 }
      );
    }

    const data = await apiRes.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      "No reply from model";

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
