"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Avatar3D from "../components/Avatar3D";

/* -------------------- ENHANCED TEXT-TO-VISEMES SYSTEM -------------------- */

// Enhanced phoneme to viseme mapping (corrected for better accuracy)
const PHONEME_TO_VISEME = {
  // Vowels - more precise mapping
  'AA': 'viseme_aa', 'AE': 'viseme_aa', 'AH': 'viseme_aa', 'AO': 'viseme_aa',
  'OW': 'viseme_O', 'UH': 'viseme_O', 'UW': 'viseme_O', 'OO': 'viseme_O', 'OU': 'viseme_O',
  'IY': 'viseme_I', 'IH': 'viseme_I', 'EE': 'viseme_I',
  'EH': 'viseme_E', 'EY': 'viseme_E', 'AY': 'viseme_aa', // AY should be more open
  
  // Consonants - corrected mappings
  'P': 'viseme_PP', 'B': 'viseme_PP', 'M': 'viseme_PP',
  'F': 'viseme_FF', 'V': 'viseme_FF',
  'S': 'viseme_SS', 'Z': 'viseme_SS', 'SH': 'viseme_SS', 'ZH': 'viseme_SS', 
  'TH': 'viseme_TH', 'DH': 'viseme_TH', // TH sounds need their own viseme
  'T': 'viseme_DD', 'D': 'viseme_DD', 'N': 'viseme_DD', 'L': 'viseme_DD',
  'K': 'viseme_kk', 'G': 'viseme_kk', 'NG': 'viseme_kk',
  'CH': 'viseme_CH', 'JH': 'viseme_CH',
  'R': 'viseme_RR', 'ER': 'viseme_RR',
  'W': 'viseme_O', 'Y': 'viseme_I', // W is lip rounding, Y is high front
  'H': 'viseme_sil', // H is often silent/breathy
  'SIL': 'viseme_sil', 'PAUSE': 'viseme_sil', 'SP': 'viseme_sil'
};

// Much improved phoneme estimation with better accuracy
function estimatePhonemes(word) {
  const phonemes = [];
  const lowerWord = word.toLowerCase();
  let i = 0;
  
  while (i < lowerWord.length) {
    let matched = false;
    
    // Check three-character combinations first
    if (i < lowerWord.length - 2) {
      const threeChar = lowerWord.slice(i, i + 3);
      switch (threeChar) {
        case 'igh': phonemes.push('AY'); i += 3; matched = true; break;
        case 'ard': phonemes.push('AA'); phonemes.push('R'); phonemes.push('D'); i += 3; matched = true; break;
        case 'ear': phonemes.push('IY'); phonemes.push('R'); i += 3; matched = true; break;
        case 'our': phonemes.push('OW'); phonemes.push('R'); i += 3; matched = true; break;
      }
    }
    
    // Check two-character combinations
    if (!matched && i < lowerWord.length - 1) {
      const twoChar = lowerWord.slice(i, i + 2);
      switch (twoChar) {
        case 'th': phonemes.push('TH'); i += 2; matched = true; break;
        case 'sh': phonemes.push('SH'); i += 2; matched = true; break;
        case 'ch': phonemes.push('CH'); i += 2; matched = true; break;
        case 'ng': phonemes.push('NG'); i += 2; matched = true; break;
        case 'ph': phonemes.push('F'); i += 2; matched = true; break;
        case 'ck': phonemes.push('K'); i += 2; matched = true; break;
        case 'qu': phonemes.push('K'); phonemes.push('W'); i += 2; matched = true; break;
        
        // Vowel combinations (more accurate)
        case 'ee': phonemes.push('IY'); i += 2; matched = true; break;
        case 'ea': 
          // Check if followed by 'r' or 'd' for different sounds
          if (i + 2 < lowerWord.length && (lowerWord[i + 2] === 'r' || lowerWord[i + 2] === 'd')) {
            phonemes.push('EH');
          } else {
            phonemes.push('IY');
          }
          i += 2; matched = true; break;
        case 'oo': 
          // 'book' vs 'food' - context dependent
          phonemes.push('UW'); i += 2; matched = true; break;
        case 'ou': phonemes.push('AW'); i += 2; matched = true; break; // 'out'
        case 'ow': 
          // 'how' vs 'show' - context dependent, default to 'OW'
          phonemes.push('OW'); i += 2; matched = true; break;
        case 'ai': phonemes.push('EY'); i += 2; matched = true; break; // 'rain'
        case 'ay': phonemes.push('EY'); i += 2; matched = true; break; // 'day'
        case 'ei': phonemes.push('EY'); i += 2; matched = true; break; // 'eight'
        case 'ey': phonemes.push('EY'); i += 2; matched = true; break; // 'they'
        case 'ie': phonemes.push('IY'); i += 2; matched = true; break; // 'piece'
        case 'oa': phonemes.push('OW'); i += 2; matched = true; break; // 'boat'
        case 'ue': phonemes.push('UW'); i += 2; matched = true; break; // 'blue'
        case 'ui': phonemes.push('UW'); i += 2; matched = true; break; // 'fruit'
        
        // Common endings
        case 'er': phonemes.push('ER'); i += 2; matched = true; break;
        case 'ar': phonemes.push('AA'); phonemes.push('R'); i += 2; matched = true; break;
        case 'or': phonemes.push('AO'); phonemes.push('R'); i += 2; matched = true; break;
        case 'ur': phonemes.push('ER'); i += 2; matched = true; break;
        case 'ir': phonemes.push('ER'); i += 2; matched = true; break;
      }
    }
    
    // Single character mapping (improved)
    if (!matched) {
      const char = lowerWord[i];
      const nextChar = i + 1 < lowerWord.length ? lowerWord[i + 1] : '';
      
      switch (char) {
        // Vowels - context aware
        case 'a': 
          if (nextChar === 'r') phonemes.push('AA');
          else if (nextChar === 'w') phonemes.push('AO');
          else if (nextChar === 'l') phonemes.push('AO');
          else phonemes.push('AE');
          break;
        case 'e': 
          if (i === lowerWord.length - 1) phonemes.push('SIL'); // silent e
          else if (nextChar === 'r') phonemes.push('ER');
          else phonemes.push('EH');
          break;
        case 'i': 
          if (nextChar === 'r') phonemes.push('ER');
          else if (nextChar === 'n' && i + 2 < lowerWord.length && lowerWord[i + 2] === 'g') phonemes.push('IH');
          else phonemes.push('IH');
          break;
        case 'o': 
          if (nextChar === 'r') phonemes.push('AO');
          else if (nextChar === 'o') phonemes.push('UW'); // will be handled by 'oo' above
          else phonemes.push('AO');
          break;
        case 'u': 
          if (nextChar === 'r') phonemes.push('ER');
          else phonemes.push('UH');
          break;
        case 'y': 
          if (i === 0) phonemes.push('Y'); // beginning of word
          else if (i === lowerWord.length - 1) phonemes.push('IY'); // end of word
          else phonemes.push('IH'); // middle
          break;
        
        // Consonants (unchanged, already good)
        case 'p': phonemes.push('P'); break;
        case 'b': phonemes.push('B'); break;
        case 't': phonemes.push('T'); break;
        case 'd': phonemes.push('D'); break;
        case 'k': phonemes.push('K'); break;
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
        case 'h': phonemes.push('H'); break;
        case 'j': phonemes.push('JH'); break;
        case 'c': 
          if (nextChar === 'h') {
            // Will be handled by 'ch' above
            phonemes.push('CH');
          } else if (nextChar === 'e' || nextChar === 'i' || nextChar === 'y') {
            phonemes.push('S'); // soft c
          } else {
            phonemes.push('K'); // hard c
          }
          break;
        case 'x': phonemes.push('K'); phonemes.push('S'); break;
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
  
  // Show word-by-word breakdown for debugging
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  words.forEach(word => {
    const wordPhonemes = estimatePhonemes(word);
    console.log(`🎭 "${word}" → [${wordPhonemes.join(', ')}]`);
  });
  
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
    
    // Adjust intensity for specific visemes that can look too strong
    let intensity = 1.0;
    if (phoneme === 'SIL') {
      intensity = 0;
    } else if (['P', 'B', 'M'].includes(phoneme)) {
      intensity = 0.7; // Reduce PP viseme intensity
    } else if (['F', 'V'].includes(phoneme)) {
      intensity = 0.8; // Slightly reduce FF viseme intensity
    }
    
    visemeSequence.push({
      viseme,
      startTime,
      endTime,
      phoneme,
      value: intensity
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

type PhonemeEvent = {
  phoneme: string;
  start?: number;
  end?: number;
};

const characters = {
  "friendly-assistant":
    "You are Nexa Scenario, a helpful and engaging assistant. Be concise, friendly, and fast. Speak clearly in New Zealand English.",
  "chilled-girl": `You are "Kea" — a chilled, friendly woman in her mid-20s from Aotearoa New Zealand. You're curious about what people do for work and for fun. You have your own hobbies and you're easy to chat with, like a mate at a café.

VOICE & STYLE
- Use New Zealand English (spelling + light slang): "keen", "sweet as", "aye?", "cheers".
- Keep it relaxed, upbeat, and human. Short sentences. Natural pauses. No lecture vibes.
- One question at a time. Don't stack questions.
- Empathy > efficiency. Use small verbal nods: "mm, nice", "gotcha", "true".
- Use gentle humour and warmth; never snarky or flirty.
- Avoid big monologues: 1–2 sentences per turn unless asked for more.

CONVERSATION GOALS (70% user / 30% you)
1) Work: role, projects, tools, recent win, current challenge, what "good" looks like.
2) Fun: weekend plans, sports/outdoors, music & gigs, gaming/films, travel, creative stuff.
3) You: sprinkle in your own interests to keep it two-way (don't monologue).

YOUR HOBBIES (refer to these naturally, not all at once)
- Coastal walks & the odd surf; sunrise photos on the phone.
- Indie gigs and making Spotify playlists.
- Cosy games (Stardew / indie sims), casual bouldering.
- Cafés and "trying to nail" a flat white at home.
- Beginner pottery—wonky mugs are a personality trait.
- Weekend road trips when the weather's mint.

INTERACTION RULES
- Start light, then go deeper with open questions ("What made you pick that?" "How did that feel?").
- Reflect back key details so they feel heard. Use their words.
- If they go quiet: offer gentle prompts ("Work stuff or fun stuff first?") or playful mini-formats (e.g., "Two-minute catch-up: one work win, one fun thing, one song on repeat?").
- If interrupted, stop immediately and let them steer.
- Summarise briefly every ~3–5 turns ("So you're a designer, love bouldering, and you're eyeing a trip to Queenstown?").
- Stay safe & respectful. No role-play of other personas, no flirting.

KEEP RESPONSES SNAPPY
- Aim 8–18 spoken words most turns. One clear follow-up.
- Everyday language over jargon.

BEHAVIOUR ON SILENCE / LAG
- If you detect silence, gently re-prompt: "Work or fun—where should we start?"`,
  detective:
    "CRITICAL: You are Detective Morgan investigating a CRIME. You are NOT helpful - you are SUSPICIOUS of everyone. START by saying 'Where were you last Tuesday night?' Be confrontational, interrupt, and assume they're lying.",
  "difficult-customer":
    "CRITICAL: You are Karen Williams, an EXTREMELY angry customer. START immediately complaining: 'This is absolutely unacceptable!' Be rude and never satisfied.",
  "strict-manager":
    "CRITICAL: You are Margaret Stone, a demanding boss. START: 'Your performance has been concerning me.' Be direct and set impossible expectations.",
  mentor:
    "You are Professor Vale, a wise and encouraging mentor. You guide people with patience and insight, asking thoughtful questions.",
};

export default function RealtimePage() {
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [currentCharacter, setCurrentCharacter] =
    useState<keyof typeof characters>("friendly-assistant");
  const [scenario, setScenario] = useState("");
  const [text, setText] = useState("");

  const MAX_RECONNECT_ATTEMPTS = 3;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] =
    useState<MediaStream | null>(null);

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const buildInstructions = useCallback(() => {
    const base = characters[currentCharacter];
    const extra = scenario
      ? `\n\nSCENARIO: ${scenario}\n\nIMPORTANT: You MUST embody this character completely from the first word.`
      : `\n\nIMPORTANT: You MUST embody this character completely from the first word.`;
    return base + extra;
  }, [currentCharacter, scenario]);

  const handleWebRTCError = (error: any, context: string) => {
    console.error(`[${context}]`, error);
    let userMessage = "Connection failed";
    if (error?.name === "NotAllowedError")
      userMessage = "Microphone access denied. Please allow the mic and retry.";
    else if (error?.name === "NotFoundError")
      userMessage = "No microphone found. Connect one and retry.";
    else if (error?.name === "NotReadableError")
      userMessage =
        "Microphone busy in another app. Close it (Zoom/Meet/etc.) and retry.";
    setError(userMessage);
    setStatus("Error");
    setConnecting(false);
    setConnected(false);
  };

  const attemptReconnect = useCallback(async () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setReconnectAttempts((prev) => prev + 1);
      setStatus(`Reconnecting... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => startSession(), 2000 * (reconnectAttempts + 1));
    } else {
      setError("Failed to reconnect after multiple attempts. Please refresh the page.");
      setStatus("Connection Failed");
    }
  }, [reconnectAttempts]);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average);
    setIsListening(average > 10);
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, []);

  function waitForIceCompleteWithTimeout(pc: RTCPeerConnection, timeoutMs = 3000) {
    return new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      };
      const onChange = () => {
        console.log("[ICE] gathering state:", pc.iceGatheringState);
        if (pc.iceGatheringState === "complete") finish();
      };
      pc.addEventListener("icegatheringstatechange", onChange);
      setTimeout(() => {
        console.warn("[ICE] Timeout waiting for complete; proceeding");
        finish();
      }, timeoutMs);
    });
  }

  async function startSession() {
    try {
      setConnecting(true);
      setError(null);
      setStatus("Requesting microphone access...");

      const local = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      localStreamRef.current = local;

      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(local);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        monitorAudioLevel();
      } catch (audioError) {
        console.warn("Audio monitoring setup failed:", audioError);
      }

      setStatus("Creating connection...");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
      });
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        console.log("[ICE] conn state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          if (connected) attemptReconnect();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[PC] state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnected(true);
          setStatus("Connected — start speaking!");
          setConnecting(false);
          setReconnectAttempts(0);
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setConnected(false);
          if (!connecting) attemptReconnect();
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
        console.log("[PC] Avatar stream set, tracks:", remoteStream.getTracks().length);

        // Enhanced audio element setup
        if (remoteAudioElRef.current) {
          remoteAudioElRef.current.addEventListener('loadstart', () => {
            console.log("🔊 Audio loading started");
          });
          
          remoteAudioElRef.current.addEventListener('loadeddata', () => {
            console.log("🔊 Audio data loaded");
          });
          
          remoteAudioElRef.current.addEventListener('canplay', () => {
            console.log("🔊 Audio can play");
          });
          
          remoteAudioElRef.current.addEventListener('play', () => {
            console.log("🔊 Audio started playing at:", remoteAudioElRef.current!.currentTime);
          });
          
          remoteAudioElRef.current.addEventListener('timeupdate', () => {
            // Debug very rarely
            if (Math.random() < 0.001) {
              console.log("🔊 Audio time:", remoteAudioElRef.current!.currentTime);
            }
          });
          
          remoteAudioElRef.current.addEventListener('ended', () => {
            console.log("🔊 Audio ended");
            visemePlayerRef.current?.stop();
          });
          
          remoteAudioElRef.current.addEventListener('pause', () => {
            console.log("🔊 Audio paused");
          });
          
          // Ensure autoplay works
          remoteAudioElRef.current.autoplay = true;
          remoteAudioElRef.current.playsInline = true;
          
          // Set volume to ensure we can hear it
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
          setError("Click anywhere to enable audio playback");
        }
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("[DC] open");
        setStatus("Connected — configuring AI...");

        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "sage",
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
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: "sage",
            instructions: buildInstructions(),
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
        console.log("[DC msg]", evt.data);
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

          // Handle audio buffer stopping
          if (msg?.type === "output_audio_buffer.stopped") {
            console.log("🔊 Audio buffer stopped - stopping visemes");
            visemePlayerRef.current?.stop();
          }

          if (msg?.type === "error") {
            setError(msg?.error?.message || "AI service error");
            setStatus("AI Error");
          }
        } catch {
          // Ignore non-JSON
        }
      };

      dc.onerror = (e) => {
        console.error("[DC] error:", e);
        setError("Data channel error — trying to reconnect...");
        attemptReconnect();
      };

      dc.onclose = () => {
        console.log("[DC] closed");
        if (connected) {
          setStatus("Disconnected");
          setConnected(false);
        }
      };

      setStatus("Establishing connection...");
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await waitForIceCompleteWithTimeout(pc);

      const sdp = pc.localDescription?.sdp || "";
      setStatus("Connecting to AI service...");

      const answerResp = await fetch(
        `/api/realtime/offer?model=${encodeURIComponent(REALTIME_MODEL)}`,
        { method: "POST", headers: { "Content-Type": "application/sdp" }, body: sdp }
      );

      console.log("[OFFER] status:", answerResp.status);
      const answerText = await answerResp.text();
      if (!answerResp.ok) {
        console.error("[OFFER failed]", answerText);
        throw new Error(`Server error: ${answerText}`);
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerText });
      setStatus("Connected — waiting for audio...");
    } catch (e: any) {
      console.error(e);
      handleWebRTCError(e, "StartSession");
    }
  }

  function stopSession() {
    setStatus("Stopping...");

    visemePlayerRef.current?.stop();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    try { audioContextRef.current?.close(); } catch {}
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
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
    audioContextRef.current = null;
    analyserRef.current = null;

    setConnected(false);
    setConnecting(false);
    setReconnectAttempts(0);
    setAudioLevel(0);
    setIsListening(false);
    setIsSpeaking(false);
    setStatus("Idle");
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  }

  function sendText() {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    const content = text.trim() || "Please continue the conversation.";

    dc.send(JSON.stringify({
      type: "response.create",
      response: {
        model: REALTIME_MODEL,
        instructions: `${buildInstructions()} User says: "${content}"`,
        modalities: ["audio", "text"],
        conversation: "auto",
      },
    }));
    setText("");
  }

  function updateCharacter(newCharacter: keyof typeof characters) {
    setCurrentCharacter(newCharacter);
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions: `${characters[newCharacter]} ${scenario ? `Scenario: ${scenario}` : ""} Please acknowledge the character change and continue in your new role.`,
          modalities: ["audio", "text"],
        },
      }));
    }
  }

  function updateScenario() {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(JSON.stringify({
      type: "response.create",
      response: {
        model: REALTIME_MODEL,
        instructions: buildInstructions() + " Please acknowledge the new scenario and adapt accordingly.",
        modalities: ["audio", "text"],
        conversation: "auto",
      },
    }));
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      try { audioContextRef.current?.close(); } catch {}
      try { dcRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
      if (remoteAudioElRef.current) {
        try { (remoteAudioElRef.current.srcObject as MediaStream | null) = null; } catch {}
        remoteAudioElRef.current.remove();
      }
      visemePlayerRef.current?.stop();
    };
  }, []);

  const enableAudio = async () => {
    if (remoteAudioElRef.current) {
      try { await remoteAudioElRef.current.play(); setError(null); }
      catch (e) { console.warn("Still blocked:", e); }
    }
  };

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center p-6 gap-6 bg-gray-50"
      onClick={enableAudio}
    >
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-2">
          Nexa Scenario — AI Roleplay
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Have real-time voice conversations with AI characters
        </p>

        <div className="mb-6">
          <Avatar3D
            character={currentCharacter}
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
            remoteAudioStream={remoteAudioStream}
            avatarUrl="/models/rpm_avatar.glb"
            realtimeDC={dcRef.current}
            onPhonemeSink={setPhonemeSink}
          />
        </div>

        <div className="bg-black text-green-400 rounded-lg p-4 mb-6 font-mono text-sm max-h-60 overflow-y-auto">
          <div className="text-white font-bold mb-2">🎭 Enhanced Viseme System</div>
          <div className="text-xs opacity-75">
            Now using performance-based timing with audio sync fallback for reliable lip sync
          </div>
          <div className="mt-2">
            Status: {connected ? "✅ Connected - enhanced viseme timing active" : "❌ Disconnected"}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    connected
                      ? "text-green-600"
                      : connecting
                      ? "text-yellow-600"
                      : error
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {status}
                </span>
              </div>

              {connected && (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"
                    }`}
                  ></div>
                  <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {connected && (
                <button
                  onClick={toggleMute}
                  className={`px-3 py-1 rounded text-sm ${
                    isMuted ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              )}

              {!connected ? (
                <button
                  onClick={startSession}
                  disabled={connecting}
                  className="px-6 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {connecting ? "Connecting..." : "Start Conversation"}
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="px-6 py-2 rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Choose Your Training Character</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Object.entries(characters).map(([key, description]) => (
              <button
                key={key}
                onClick={() => updateCharacter(key as keyof typeof characters)}
                className={`p-4 rounded-lg text-left transition-all ${
                  currentCharacter === key
                    ? "bg-blue-100 border-2 border-blue-500 text-blue-800"
                    : "bg-gray-100 border-2 border-transparent hover:bg-gray-200"
                }`}
              >
                <div className="font-bold capitalize text-lg">
                  {key === "difficult-customer"
                    ? "😤 Difficult Customer"
                    : key === "strict-manager"
                    ? "👔 Strict Manager"
                    : key === "detective"
                    ? "🕵️ Detective"
                    : key === "mentor"
                    ? "👨‍🏫 Mentor"
                    : key.replace("-", " ")}
                </div>
                <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                  {description.slice(0, 80)}...
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Custom Scenario (Optional)</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g., 'You're investigating a mysterious disappearance in a small town...'"
              />
              <button
                onClick={updateScenario}
                disabled={!connected || !scenario.trim()}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50 hover:bg-green-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium mb-2">Send Text Message</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message to send during conversation..."
              onKeyDown={(e) => e.key === "Enter" && sendText()}
            />
            <button
              onClick={sendText}
              disabled={!connected || !text.trim()}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}