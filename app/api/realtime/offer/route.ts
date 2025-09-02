export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const model = url.searchParams.get("model") || "gpt-4o-realtime-preview";
    const sdpOffer = await req.text();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: sdpOffer,
      }
    );

    const answer = await upstream.text();
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `OpenAI error ${upstream.status}`, details: answer }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(answer, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
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
