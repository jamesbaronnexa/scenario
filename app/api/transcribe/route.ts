export const runtime = "nodejs"; // needs Node APIs for FormData/File

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get audio blob from client (as multipart/form-data)
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const language = (form.get("language") as string) || "en";

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "No audio uploaded" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Forward to OpenAI Whisper
    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: (() => {
        const fd = new FormData();
        // Whisper expects "file" + "model"
        fd.append("file", audio, (audio as File).name || "audio.webm");
        fd.append("model", "whisper-1"); // stable transcription model
        fd.append("response_format", "json");
        fd.append("language", language);
        return fd;
      })(),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `OpenAI error ${upstream.status}`, details: errText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await upstream.json();
    // OpenAI returns { text: "transcription" }
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(e?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
