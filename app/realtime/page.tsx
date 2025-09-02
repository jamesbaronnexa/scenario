// @ts-nocheck
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Avatar3D from "../components/Avatar3D";

/* -------------------- ENHANCED TEXT-TO-VISEMES SYSTEM -------------------- */

// Enhanced phoneme to viseme mapping
const PHONEME_TO_VISEME = {
  // Vowels
  'AA': 'viseme_aa', 'AE': 'viseme_aa', 'AH': 'viseme_aa', 'AO': 'viseme_aa',
  'OW': 'viseme_O', 'UH': 'viseme_O', 'UW': 'viseme_O', 'OO': 'viseme_O', 'OU': 'viseme_O',
  'IY': 'viseme_I', 'IH': 'viseme_I', 'EE': 'viseme_I',
  'EH': 'viseme_E', 'EY': 'viseme_E', 'AY': 'viseme_E',
  
  // Consonants
  'P': 'viseme_PP', 'B': 'viseme_PP', 'M': 'viseme_PP',
  'F': 'viseme_FF', 'V': 'viseme_FF',
  'S': 'viseme_SS', 'Z': 'viseme_SS', 'SH': 'viseme_SS', 'ZH': 'viseme_SS', 'TH': 'viseme_SS', 'DH': 'viseme_SS',
  'T': 'viseme_DD', 'D': 'viseme_DD', 'N': 'viseme_DD',
  'K': 'viseme_kk', 'G': 'viseme_kk', 'NG': 'viseme_kk',
  'CH': 'viseme_CH', 'JH': 'viseme_CH',
  'R': 'viseme_RR', 'ER': 'viseme_RR',
  'L': 'viseme_nn', 'W': 'viseme_O', 'Y': 'viseme_I',
  'SIL': 'viseme_sil', 'PAUSE': 'viseme_sil', 'SP': 'viseme_sil'
};

// Much improved phoneme estimation with better variety
function estimatePhonemes(word) {
  const phonemes = [];
  const lowerWord = word.toLowerCase();
  let i = 0;
  
  while (i < lowerWord.length) {
    let matched = false;
    
    // Check two-character combinations first
    if (i < lowerWord.length - 1) {
      const twoChar = lowerWord.slice(i, i + 2);
      switch (twoChar) {
        case 'th': phonemes.push('TH'); i += 2; matched = true; break;
        case 'sh': phonemes.push('SH'); i += 2; matched = true; break;
        case 'ch': phonemes.push('CH'); i += 2; matched = true; break;
        case 'ng': phonemes.push('NG'); i += 2; matched = true; break;
        case 'ph': phonemes.push('F'); i += 2; matched = true; break;
        case 'ck': phonemes.push('K'); i += 2; matched = true; break;
        case 'qu': phonemes.push('K'); phonemes.push('W'); i += 2; matched = true; break;
        case 'ee': phonemes.push('IY'); i += 2; matched = true; break;
        case 'ea': phonemes.push('IY'); i += 2; matched = true; break;
        case 'oo': phonemes.push('UW'); i += 2; matched = true; break;
        case 'ou': phonemes.push('OW'); i += 2; matched = true; break;
        case 'ow': phonemes.push('OW'); i += 2; matched = true; break;
        case 'ai': phonemes.push('AY'); i += 2; matched = true; break;
        case 'ay': phonemes.push('AY'); i += 2; matched = true; break;
        case 'ei': phonemes.push('EY'); i += 2; matched = true; break;
        case 'ey': phonemes.push('EY'); i += 2; matched = true; break;
      }
    }
    
    // Single character mapping
    if (!matched) {
      const char = lowerWord[i];
      switch (char) {
        // Vowels with more variety
        case 'a': phonemes.push('AE'); break;
        case 'e': phonemes.push('EH'); break;
        case 'i': phonemes.push('IH'); break;
        case 'o': phonemes.push('AO'); break;
        case 'u': phonemes.push('UH'); break;
        
        // Consonants
        case 'p': phonemes.push('P'); break;
        case 'b': phonemes.push('B'); break;
        case 't': phonemes.push('T'); break;
        case 'd': phonemes.push('D'); break;
        case 'k': case 'c': phonemes.push('K'); break;
        case 'g': phonemes.push('G'); break;
        case 'f': phonemes.push('F'); break;
        case 'v': phonemes.push('V'); break;
        case 's': phonemes.push('S'); break;
        case 'z': phonemes.push('Z'); break;
        case 'm': phonemes.push('M'); break;
        case 'n': phonemes.push('N'); break;
        case 'l': phonemes.push('L'); break;
        case 'r': phonemes.push('R'); break;
        case 'w': phonemes.push('W'); break;
        case 'y': phonemes.push('Y'); break;
        case 'h': phonemes.push('SIL'); break; // H is often silent in visemes
        case 'j': phonemes.push('JH'); break;
        case 'x': phonemes.push('K'); phonemes.push('S'); break; // X = KS
        default:
          // Skip unrecognized characters
          break;
      }
      i++;
    }
  }
  
  return phonemes.length > 0 ? phonemes : ['SIL'];
}

function textToPhonemes(text) {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  const phonemes = [];
  
  words.forEach((word, index) => {
    const wordPhonemes = estimatePhonemes(word);
    phonemes.push(...wordPhonemes);
    if (index < words.length - 1) {
      phonemes.push('SIL');
    }
  });
  
  return phonemes;
}

// Enhanced viseme generation with debug logging
function generateRealtimeVisemes(text, estimatedDurationMs = null) {
  console.log("🎭 Generating visemes for text:", text);
  const phonemes = textToPhonemes(text);
  console.log("🎭 Generated phonemes:", phonemes);
  
  const visemeSequence = [];
  
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  
  const duration = estimatedDurationMs || Math.max(
    wordCount * 400,  
    charCount * 45,   
    phonemes.length * 80 
  );
  
  const phonemeDuration = Math.max(duration / phonemes.length, 80);
  console.log(`🎭 Duration: ${duration}ms, Phoneme duration: ${phonemeDuration}ms`);
  
  phonemes.forEach((phoneme, index) => {
    const viseme = PHONEME_TO_VISEME[phoneme] || 'viseme_sil';
    const startTime = index * phonemeDuration;
    const endTime = startTime + phonemeDuration;
    
    visemeSequence.push({
      viseme,
      startTime,
      endTime,
      phoneme,
      value: phoneme === 'SIL' ? 0 : 1.0
    });
  });
  
  console.log("🎭 Generated viseme sequence:", visemeSequence.map(v => `${v.viseme}@${Math.round(v.startTime)}ms`));
  return visemeSequence;
}

// Enhanced RealtimeVisemePlayer with proper audio synchronization
class RealtimeVisemePlayer {
  constructor(dispatchCallback) {
    this.dispatchCallback = dispatchCallback;
    this.currentSequence = [];
    this.audioElement = null;
    this.animationFrame = null;
    this.isPlaying = false;
    this.pendingSequences = new Map();
    this.currentResponseId = null;
    this.startTime = null; // Track when visemes should start
    this.fallbackTimer = null; // Fallback timing mechanism
  }
  
  queueSequence(responseId, visemeSequence, debugText = "") {
    console.log(`🎭 Queueing viseme sequence for response ${responseId}:`, debugText);
    this.pendingSequences.set(responseId, {
      sequence: visemeSequence,
      text: debugText,
      queued: performance.now()
    });
  }
  
  startForResponse(responseId) {
    const pending = this.pendingSequences.get(responseId);
    if (!pending) {
      console.warn(`🎭 No queued sequence found for response ${responseId}`);
      return false;
    }
    
    console.log(`🎭 Starting visemes for response ${responseId}:`, pending.text);
    
    // Stop any current sequence
    this.stop();
    
    this.currentSequence = pending.sequence;
    this.currentResponseId = responseId;
    this.pendingSequences.delete(responseId);
    
    // Try to find audio element
    this.audioElement = document.querySelector('audio');
    
    // Start immediately with fallback timing - don't wait for audio
    this.startTime = performance.now();
    this.startVisemePlayback();
    
    return true;
  }
  
  startVisemePlayback() {
    if (!this.currentSequence.length) return;
    
    console.log("🎭 Starting viseme playback with fallback timing");
    this.isPlaying = true;
    
    // Use performance-based timing as primary method
    const animate = () => {
      if (!this.isPlaying) return;
      
      const elapsedMs = performance.now() - this.startTime;
      
      // Try to sync with audio if available and actually playing
      let syncTimeMs = elapsedMs;
      if (this.audioElement && !this.audioElement.paused && this.audioElement.currentTime > 0) {
        syncTimeMs = this.audioElement.currentTime * 1000;
        // Debug very occasionally
        if (Math.random() < 0.01) {
          console.log(`🎭 Audio sync: ${Math.round(syncTimeMs)}ms`);
        }
      }
      
      // Find current viseme
      const currentViseme = this.currentSequence.find(
        v => syncTimeMs >= v.startTime && syncTimeMs < v.endTime
      );
      
      if (currentViseme) {
        this.dispatchCallback({
          viseme: currentViseme.viseme,
          value: currentViseme.value,
          phoneme: currentViseme.phoneme
        });
      } else {
        // Default to silence
        this.dispatchCallback({
          viseme: 'viseme_sil',
          value: 0,
          phoneme: 'SIL'
        });
      }
      
      // Continue animation
      this.animationFrame = requestAnimationFrame(animate);
      
      // Auto-stop after sequence duration + buffer
      const maxDuration = Math.max(...this.currentSequence.map(v => v.endTime)) + 1000;
      if (elapsedMs > maxDuration) {
        console.log("🎭 Viseme sequence completed");
        this.stop();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  play(visemeSequence, debugText = "") {
    console.log("🎭 Direct play (legacy):", debugText);
    this.stop();
    this.currentSequence = visemeSequence;
    this.audioElement = document.querySelector('audio');
    if (this.audioElement) {
      this.syncToAudio();
    }
  }
  
  syncToAudio() {
    // Legacy method - kept for compatibility but not used
    console.log("🎭 Legacy syncToAudio called");
    this.startVisemePlayback();
  }
  
  stop() {
    console.log("🎭 Stopping viseme player");
    this.isPlaying = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    
    this.currentSequence = [];
    this.currentResponseId = null;
    this.startTime = null;
    
    // Reset to silence
    this.dispatchCallback({
      viseme: 'viseme_sil',
      value: 0,
      phoneme: 'SIL'
    });
  }
  
  clearPending() {
    this.pendingSequences.clear();
  }
}

/* -------------------- Original Phoneme → OVR viseme mapping -------------------- */
function mapPhonemeToOVR(p: string): string {
  const s = (p || "").toUpperCase();

  if (["AA", "AE", "AH", "AO"].includes(s)) return "viseme_aa";
  if (["OW", "OU", "OH", "UH", "UW", "OO", "OY"].includes(s)) return "viseme_O";
  if (["IY", "IH", "EE"].includes(s)) return "viseme_I";
  if (["EH", "EY", "AY", "E"].includes(s)) return "viseme_E";
  if (["S", "Z", "SH", "ZH", "TH", "DH"].includes(s)) return "viseme_SS";
  if (["F", "V"].includes(s)) return "viseme_FF";
  if (["CH", "JH"].includes(s)) return "viseme_CH";
  if (["P", "B", "M"].includes(s)) return "viseme_PP";
  if (["T", "D"].includes(s)) return "viseme_DD";
  if (["K", "G"].includes(s)) return "viseme_kk";
  if (["N", "NG"].includes(s)) return "viseme_nn";
  if (["R", "ER"].includes(s)) return "viseme_RR";
  if (["SIL", "PAUSE", "SP"].includes(s)) return "viseme_sil";
  return "viseme_sil";
}

function dispatchViseme(
  sink: ((e: { phoneme: string; start?: number; end?: number }) => void) | null,
  viseme: string,
  value: number,
  start?: number,
  end?: number
) {
  // Only log viseme changes, not repeats
  if (!dispatchViseme.lastViseme || dispatchViseme.lastViseme !== viseme) {
    console.log(`🎯 VISEME: ${viseme} (${value})`);
    dispatchViseme.lastViseme = viseme;
  }
  sink?.({ phoneme: viseme, start, end });
  window.dispatchEvent(new CustomEvent("phoneme", { detail: { viseme, value } }));
}
dispatchViseme.lastViseme = null;

const REALTIME_MODEL = "gpt-4o-mini-realtime-preview-2024-12-17";

// Single character personality - no options to change
const CHARACTER_INSTRUCTIONS = "You are Kea — a chilled, friendly woman in her mid-20s from Aotearoa New Zealand. You're curious about what people do for work and for fun. You have your own hobbies and you're easy to chat with, like a mate at a café. Use New Zealand English (spelling + light slang): 'keen', 'sweet as', 'aye?', 'cheers'. Keep it relaxed, upbeat, and human. Short sentences. Natural pauses. No lecture vibes. One question at a time. Don't stack questions. Empathy > efficiency. Use small verbal nods: 'mm, nice', 'gotcha', 'true'. Use gentle humour and warmth; never snarky or flirty. Avoid big monologues: 1–2 sentences per turn unless asked for more.";

type PhonemeEvent = {
  phoneme: string;
  start?: number;
  end?: number;
};

export default function RealtimePage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);

  const phonemeSinkRef = useRef<((e: PhonemeEvent) => void) | null>(null);
  const setPhonemeSink = useCallback((sink: (e: PhonemeEvent) => void) => {
    phonemeSinkRef.current = sink;
  }, []);

  const visemePlayerRef = useRef<RealtimeVisemePlayer | null>(null);
  
  useEffect(() => {
    visemePlayerRef.current = new RealtimeVisemePlayer((data) => {
      dispatchViseme(phonemeSinkRef.current, data.viseme, data.value);
    });
    
    return () => {
      visemePlayerRef.current?.stop();
    };
  }, []);

  const setRemoteAudioStreamWithLogging = (stream: MediaStream | null) => {
    console.log("=== SETTING REMOTE AUDIO STREAM ===");
    console.log("New stream:", stream);
    console.log("Stream tracks:", stream?.getTracks().length || 0);
    setRemoteAudioStream(stream);
  };

  async function startSession() {
    try {
      setConnecting(true);
      setError(null);

      const local = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      localStreamRef.current = local;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
      });
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        console.log("[PC] state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnected(true);
          setConnecting(false);
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnected(false);
        }
      };

      const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      for (const track of local.getAudioTracks()) {
        audioTransceiver.sender.replaceTrack(track);
      }

      const remoteStream = new MediaStream();
      if (!remoteAudioElRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.playsInline = true;
        el.controls = false;
        el.style.display = "none";
        document.body.appendChild(el);
        remoteAudioElRef.current = el;
      }
      remoteAudioElRef.current.srcObject = remoteStream;

      pc.ontrack = async (e) => {
        console.log("[PC] ontrack:", e.track.kind);
        for (const t of e.streams[0].getTracks()) remoteStream.addTrack(t);
        setRemoteAudioStreamWithLogging(remoteStream);

        if (remoteAudioElRef.current) {
          remoteAudioElRef.current.autoplay = true;
          remoteAudioElRef.current.playsInline = true;
          remoteAudioElRef.current.volume = 1.0;
        }

        // Monitor AI speaking
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(remoteStream);
        const an = ctx.createAnalyser();
        src.connect(an);
        const loop = () => {
          const data = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(avg > 5);
          requestAnimationFrame(loop);
        };
        loop();

        try {
          await remoteAudioElRef.current?.play();
          console.log("🔊 Audio autoplay successful");
        } catch (err) {
          console.warn("🔊 Autoplay blocked:", err);
          setError("Click anywhere to enable audio");
        }
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("[DC] open");

        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "sage",
            instructions: CHARACTER_INSTRUCTIONS,
            turn_detection: {
              type: "server_vad",
              threshold: 0.4,
              prefix_padding_ms: 200,
              silence_duration_ms: 600,
              create_response: true,
              interrupt_response: true,
            },
          },
        }));

        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: "Give a one-sentence spoken greeting to start the conversation.",
          },
        }));
      };

      // Enhanced message handler with perfect synchronization
      dc.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const responseId = msg?.response_id || msg?.id || `response_${Date.now()}`;

          // Queue visemes when we get the complete transcript
          if (msg?.type === "response.audio_transcript.done" && msg?.transcript) {
            console.log("📝 COMPLETE TRANSCRIPT:", msg.transcript);
            const visemeSequence = generateRealtimeVisemes(msg.transcript);
            visemePlayerRef.current?.queueSequence(responseId, visemeSequence, msg.transcript);
          }

          // Fallback to text events
          if (msg?.type === "response.text.done" && msg?.text && !msg?.transcript) {
            console.log("📝 COMPLETE TEXT:", msg.text);
            const visemeSequence = generateRealtimeVisemes(msg.text);
            visemePlayerRef.current?.queueSequence(responseId, visemeSequence, msg.text);
          }

          // Start visemes immediately when audio buffer starts
          if (msg?.type === "output_audio_buffer.started") {
            console.log("🔊 Audio buffer started for response:", responseId);
            
            // Small delay to ensure audio element is ready, then start
            setTimeout(() => {
              const started = visemePlayerRef.current?.startForResponse(responseId);
              if (!started) {
                console.warn("🎭 Failed to start visemes, will retry when transcript arrives");
              }
            }, 100);
          }

          // Also try to start when we get the transcript if not already started
          if (msg?.type === "response.audio_transcript.done") {
            // Check if we should start now
            setTimeout(() => {
              if (visemePlayerRef.current?.currentResponseId !== responseId) {
                console.log("🎭 Starting visemes from transcript event");
                visemePlayerRef.current?.startForResponse(responseId);
              }
            }, 50);
          }

          // Direct OpenAI visemes (fallback)
          if (msg?.type === "response.viseme" || msg?.type === "response.phoneme") {
            console.log("🎤 DIRECT OPENAI VISEME:", msg);
            const raw = msg.viseme ?? msg.phoneme ?? msg.label ?? msg.id ?? "SIL";
            const viseme = String(raw).startsWith("viseme_") ? String(raw) : mapPhonemeToOVR(String(raw));
            const value = typeof msg.value === "number" ? msg.value : 1.0;
            dispatchViseme(phonemeSinkRef.current, viseme, value);
          }

          // Handle audio buffer clearing (when user interrupts)
          if (msg?.type === "output_audio_buffer.cleared") {
            console.log("🔊 Audio buffer cleared - stopping visemes");
            visemePlayerRef.current?.stop();
          }

          if (msg?.type === "error") {
            setError(msg?.error?.message || "AI service error");
          }
        } catch {
          // Ignore non-JSON
        }
      };

      dc.onerror = (e) => {
        console.error("[DC] error:", e);
        setError("Connection error");
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      const sdp = pc.localDescription?.sdp || "";

      const answerResp = await fetch(
        `/api/realtime/offer?model=${encodeURIComponent(REALTIME_MODEL)}`,
        { method: "POST", headers: { "Content-Type": "application/sdp" }, body: sdp }
      );

      const answerText = await answerResp.text();
      if (!answerResp.ok) {
        throw new Error(`Server error: ${answerText}`);
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerText });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Connection failed");
      setConnecting(false);
      setConnected(false);
    }
  }

  function stopSession() {
    visemePlayerRef.current?.stop();
    
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}

    if (remoteAudioElRef.current) {
      try { (remoteAudioElRef.current.srcObject as MediaStream | null) = null; } catch {}
      remoteAudioElRef.current.remove();
      remoteAudioElRef.current = null;
    }

    dcRef.current = null;
    pcRef.current = null;
    localStreamRef.current = null;
    setRemoteAudioStreamWithLogging(null);

    setConnected(false);
    setConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
  }

  const enableAudio = async () => {
    if (remoteAudioElRef.current) {
      try { 
        await remoteAudioElRef.current.play(); 
        setError(null); 
      } catch (e) { 
        console.warn("Audio still blocked:", e); 
      }
    }
  };

  return (
    <main 
      className="w-full h-screen relative bg-gray-900 overflow-hidden"
      onClick={enableAudio}
    >
      {/* Full Screen Avatar */}
      <div className="absolute inset-0">
        <Avatar3D
          character="Kea"
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevel={0}
          remoteAudioStream={remoteAudioStream}
          avatarUrl="https://models.readyplayer.me/68b61ace83ef17237fd6e69f.glb?pose=T&morphTargets=ARKit,Oculus%20Visemes&textureAtlas=1024"
          realtimeDC={dcRef.current}
          onPhonemeSink={setPhonemeSink}
        />
      </div>

      {/* Single Start Button Overlay */}
      {!connected && !connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <button
            onClick={startSession}
            className="bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:bg-gray-100 transition-all duration-200"
          >
            Start Conversation
          </button>
        </div>
      )}

      {/* Connecting State */}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Connecting...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm z-50">
          {error}
        </div>
      )}

      {/* Stop Button (only shows when connected) */}
      {connected && (
        <button
          onClick={stopSession}
          className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors z-50"
        >
          End Conversation
        </button>
      )}
    </main>
  );
}