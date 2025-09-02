export const runtime = "nodejs"; // needs Node APIs for binary buffers

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { text, voice = "alloy", format = "mp3" } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing 'text' to speak" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // OpenAI TTS REST API
    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",      // fast, good quality (alt: "tts-1-hd")
        voice,               // "alloy", "verse", "ballad", "sage", etc.
        input: text,
        format,              // "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm"
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `OpenAI error ${upstream.status}`, details: errText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const arrayBuf = await upstream.arrayBuffer();

    // Map content-type from chosen format
    const contentType =
      format === "wav" ? "audio/wav"
      : format === "opus" ? "audio/ogg"
      : format === "aac" ? "audio/aac"
      : format === "flac" ? "audio/flac"
      : format === "pcm" ? "audio/L16"
      : "audio/mpeg"; // mp3 default

    return new Response(arrayBuf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(e?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
