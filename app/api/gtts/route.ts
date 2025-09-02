import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // quick health check
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_TTS_API_KEY" },
        { status: 500 }
      );
    }

    // TalkingHead sends Google TTS JSON body straight through
    const body = await req.text();

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const txt = await r.text();
    return new NextResponse(txt, {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
