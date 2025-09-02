"use client";
import { useEffect, useRef, useState } from "react";

/** --- Web Speech typings --- */
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}
type SRClass = new () => SpeechRecognition;

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  // Mic / captions state
  const [recording, setRecording] = useState(false);
  const [liveText, setLiveText] = useState("");

  // Speech synthesis (live TTS) refs
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const chunkBufferRef = useRef<string>("");         // accumulates tokens until we speak a chunk
  const lastTokenAtRef = useRef<number>(0);          // timestamp of last token arrival
  const flushTimerRef = useRef<number | null>(null); // debounce timer for flushing partials

  // Audio (file-based) pieces from earlier are not used here for live speaking.
  // We rely on speechSynthesis for instant playback.

  // SpeechRecognition + fallback recorder refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalSentRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supportsSR =
    typeof window !== "undefined" &&
    (("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window));

  /** ----------------------------
   * Live speech helpers
   * --------------------------- */

  // Initialize speech synthesis on first client render
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  function cancelAllSpeech() {
    try {
      synthRef.current?.cancel();
    } catch {}
    // clear pending buffer and timers
    chunkBufferRef.current = "";
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }

  function speakChunk(text: string) {
    const chunk = text.trim();
    if (!chunk) return;
    const u = new SpeechSynthesisUtterance(chunk);
    // Tune these if you like:
    u.rate = 1.03;   // slightly faster for snappier feel
    u.pitch = 1.0;
    u.lang = "en-NZ"; // pick locale to taste; voices vary by system
    synthRef.current?.speak(u);
  }

  // Heuristic: flush buffered text when we detect likely sentence/phrase end,
  // or after a small delay with no new tokens.
  function maybeFlushChunk(force = false) {
    const buf = chunkBufferRef.current;
    if (!buf) return;

    const sentenceEnd = /[.!?]\s$/.test(buf);
    const longPhrase = buf.length >= 80; // speak long phrases even without punctuation
    if (force || sentenceEnd || longPhrase) {
      speakChunk(buf);
      chunkBufferRef.current = "";
      return;
    }

    // Debounced flush: if no new tokens for 400ms, speak what we have
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      // Only flush if it's been quiet for a while and we still have content
      const now = Date.now();
      if (now - lastTokenAtRef.current >= 350 && chunkBufferRef.current) {
        speakChunk(chunkBufferRef.current);
        chunkBufferRef.current = "";
      }
    }, 400) as unknown as number;
  }

  /** ----------------------------
   * Streaming the model reply (text + live voice)
   * --------------------------- */
  async function sendMessageStreaming(textOverride?: string) {
    const toSend = (textOverride ?? message).trim();
    if (!toSend) return;

    setLoading(true);
    setReply("");

    // Interrupt any current live speech and clear buffers
    cancelAllSpeech();

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date().toISOString();

    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: toSend, timezone, now }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      setReply(`⚠️ Server error: ${text}`);
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.startsWith("data:")) continue;
        const dataStr = part.replace(/^data:\s*/, "");

        if (dataStr === "[DONE]") {
          setLoading(false);
          // Force out any leftover partial at the end
          maybeFlushChunk(true);
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const token =
            json?.choices?.[0]?.delta?.content ??
            json?.choices?.[0]?.text ??
            "";
          if (token) {
            // Append to on-screen text
            setReply((prev) => prev + token);

            // Append to speech buffer and maybe speak
            chunkBufferRef.current += token;
            lastTokenAtRef.current = Date.now();
            maybeFlushChunk(false);
          }
        } catch {
          // ignore keepalives / non-JSON lines
        }
      }
    }

    setLoading(false);
    // safety: flush leftover if loop exited without DONE
    maybeFlushChunk(true);
  }

  /** ----------------------------
   * Web Speech API: live captions + final send
   * --------------------------- */
  function startSpeechRecognition() {
    const SR: SRClass =
      (window.SpeechRecognition as SRClass) ||
      (window.webkitSpeechRecognition as SRClass);
    if (!SR) return;

    const rec = new SR();
    recognitionRef.current = rec;

    rec.continuous = false;    // push-to-talk
    rec.interimResults = true; // show partials
    rec.lang = "en-NZ";

    rec.onstart = () => {
      setRecording(true);
      setLiveText("");
      finalSentRef.current = false;
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) setLiveText(interim);
      if (final && !finalSentRef.current) {
        finalSentRef.current = true;
        setLiveText("");
        setMessage(final);
        void sendMessageStreaming(final);
      }
    };

    rec.onerror = () => {
      // fall back to recorder + Whisper if SR fails
      void startRecorderFallback();
    };

    rec.onend = () => {
      setRecording(false);
      finalSentRef.current = false;
    };

    rec.start();
  }

  function stopSpeechRecognition() {
    recognitionRef.current?.stop();
  }

  /** ----------------------------
   * Fallback: local recording → /api/transcribe (Whisper)
   * --------------------------- */
  async function ensureMic() {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }

  async function startRecorderFallback() {
    const stream = await ensureMic();
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";

    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    });

    mr.addEventListener("stop", handleRecordingStopFallback);

    mr.start();
    setRecording(true);
  }

  async function stopRecorderFallback() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  async function handleRecordingStopFallback() {
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    const fd = new FormData();
    fd.append("audio", blob, "clip.webm");

    setLoading(true);
    setReply("");
    cancelAllSpeech(); // ensure no stale speech is playing

    try {
      const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
      const trJson = await tr.json();
      if (!tr.ok) {
        setReply(`⚠️ Transcription error: ${trJson?.error ?? tr.statusText}`);
        setLoading(false);
        return;
      }
      const text: string = trJson?.text ?? "";
      setMessage(text);
      await sendMessageStreaming(text);
    } catch (e: any) {
      setReply(`⚠️ Network error: ${String(e?.message ?? e)}`);
      setLoading(false);
    }
  }

  /** ----------------------------
   * Mic press/hold handlers
   * --------------------------- */
  async function handleMicDown() {
    if (supportsSR) startSpeechRecognition();
    else await startRecorderFallback();
  }
  async function handleMicUp() {
    if (supportsSR) stopSpeechRecognition();
    else await stopRecorderFallback();
  }

  /** ----------------------------
   * Cleanup
   * --------------------------- */
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { mediaRecorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAllSpeech();
    };
  }, []);

  /** ----------------------------
   * UI
   * --------------------------- */
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-bold">Nexa Scenario — Live Voice on Stream</h1>

      <textarea
        className="w-full max-w-xl border rounded p-3"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type or hold the mic…"
      />

      {recording && liveText && (
        <div className="w-full max-w-xl text-sm opacity-70">
          <span className="font-semibold">Listening: </span>
          <span>{liveText}</span>
          <span className="animate-pulse">▌</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => sendMessageStreaming()}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? "Streaming…" : "Send (text)"}
        </button>

        {/* Push‑to‑talk */}
        <button
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onTouchStart={(e) => { e.preventDefault(); handleMicDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); handleMicUp(); }}
          className={`px-4 py-2 rounded ${recording ? "bg-red-600" : "bg-gray-800"} text-white`}
          title="Hold to talk"
        >
          {recording ? "Recording…" : "🎙️ Hold to Talk"}
        </button>
      </div>

      <div className="w-full max-w-xl border rounded p-3 bg-gray-50 min-h-[140px] whitespace-pre-wrap">
        <div className="font-semibold mb-1">AI</div>
        {reply || (loading ? "…" : "")}
      </div>

      <p className="text-xs opacity-60">
        Uses the browser’s Speech Synthesis for instant voice as tokens arrive.
      </p>
    </main>
  );
}
