"use client";
import { useState, useRef, useEffect } from "react";
import RPMAvatar3D from "../components/Avatar3D";

// Type definitions for better TypeScript support
interface VisemeData {
  phoneme: string;
  start?: number;
  end?: number;
}

interface AudioConnection {
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  remoteAudioEl: HTMLAudioElement | null;
}

type SRClass = new () => SpeechRecognition;

export default function RealtimePage() {
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  
  const audioConnectionRef = useRef<AudioConnection>({
    pc: null,
    dc: null,
    remoteAudioEl: null,
  });
  
  const visemePlayerRef = useRef<RealtimeVisemePlayer | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const finalSentRef = useRef(false);

  // Enhanced RealtimeVisemePlayer with proper TypeScript
  class RealtimeVisemePlayer {
    public dispatchCallback: (e: VisemeData) => void;
    public currentSequence: any[];
    public audioElement: HTMLAudioElement | null;
    public animationFrame: number | null;
    public isPlaying: boolean;
    public pendingSequences: Map<string, any>;
    public currentResponseId: string | null;
    public startTime: number | null;
    public fallbackTimer: number | null;

    constructor(dispatchCallback: (e: VisemeData) => void) {
      this.dispatchCallback = dispatchCallback;
      this.currentSequence = [];
      this.audioElement = null;
      this.animationFrame = null;
      this.isPlaying = false;
      this.pendingSequences = new Map();
      this.currentResponseId = null;
      this.startTime = null;
      this.fallbackTimer = null;
    }

    start(sequence: any[], audioElement?: HTMLAudioElement | null): void {
      console.log("🎬 Starting viseme sequence:", sequence.length, "items");
      
      this.stop(); // Stop any existing animation
      this.currentSequence = sequence;
      this.audioElement = audioElement || null;
      this.isPlaying = true;
      this.startTime = performance.now();

      // Start performance-based timing immediately
      this.tick();

      // Try to sync with audio if available
      if (this.audioElement) {
        this.waitForAudioStart();
      }
    }

    private waitForAudioStart(): void {
      if (!this.audioElement || !this.isPlaying) return;

      const checkAudio = (): void => {
        if (!this.audioElement || !this.isPlaying) return;

        if (this.audioElement.currentTime > 0 && !this.audioElement.paused) {
          console.log("🔊 Audio started, syncing visemes");
          this.startTime = performance.now() - (this.audioElement.currentTime * 1000);
        } else {
          setTimeout(checkAudio, 50);
        }
      };

      checkAudio();
    }

    private tick(): void {
      if (!this.isPlaying || this.currentSequence.length === 0) return;

      const now = performance.now();
      const elapsedMs = now - (this.startTime || now);

      // Try to sync with audio if available and actually playing
      let syncTimeMs = elapsedMs;
      if (this.audioElement && !this.audioElement.paused && this.audioElement.currentTime > 0) {
        syncTimeMs = this.audioElement.currentTime * 1000;
      }

      // Find current viseme
      const currentViseme = this.currentSequence.find(item => 
        syncTimeMs >= (item.start || 0) && syncTimeMs < (item.end || item.start + 100)
      );

      if (currentViseme) {
        this.dispatchCallback({
          phoneme: currentViseme.phoneme || currentViseme.viseme || 'sil',
          start: currentViseme.start,
          end: currentViseme.end
        });
      }

      // Continue animation
      if (this.isPlaying) {
        this.animationFrame = requestAnimationFrame(() => this.tick());
      }
    }

    stop(): void {
      console.log("⏹️ Stopping viseme player");
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
      this.audioElement = null;
      this.startTime = null;
    }
  }

  // Initialize viseme player
  useEffect(() => {
    const handleViseme = (data: VisemeData): void => {
      window.dispatchEvent(new CustomEvent("viseme", { 
        detail: { 
          viseme: data.phoneme, 
          value: 1.0,
          start: data.start,
          end: data.end
        } 
      }));
    };

    visemePlayerRef.current = new RealtimeVisemePlayer(handleViseme);

    return () => {
      if (visemePlayerRef.current) {
        visemePlayerRef.current.stop();
      }
    };
  }, []);

  // Speech Recognition Setup
  const setupSpeechRecognition = (): void => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      console.warn("Speech recognition not supported");
      return;
    }

    const rec = new SpeechRecognitionConstructor() as SpeechRecognition;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-NZ";

    rec.onstart = () => {
      setIsRecording(true);
      setLiveText("");
      finalSentRef.current = false;
    };

    rec.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript && !finalSentRef.current) {
        console.log("Final transcript:", finalTranscript);
        finalSentRef.current = true;
        
        if (audioConnectionRef.current.dc && audioConnectionRef.current.dc.readyState === "open") {
          const event = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: finalTranscript.trim() }]
            }
          };
          audioConnectionRef.current.dc.send(JSON.stringify(event));

          const responseEvent = { type: "response.create" };
          audioConnectionRef.current.dc.send(JSON.stringify(responseEvent));
        }

        setLiveText("");
        rec.stop();
      } else if (interimTranscript) {
        setLiveText(interimTranscript);
      }
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setLiveText("");
    };

    rec.onend = () => {
      setIsRecording(false);
      if (!finalSentRef.current) {
        setLiveText("");
      }
    };

    speechRecognitionRef.current = rec;
  };

  // Audio Connection Setup
  const connectToOpenAI = async (): Promise<void> => {
    try {
      setConnectionStatus("Connecting...");
      
      const pc = new RTCPeerConnection();
      
      // Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(stream.getTracks()[0]);

      // Create data channel
      const dc = pc.createDataChannel("oai-events");
      
      // Handle audio track
      pc.ontrack = (event) => {
        console.log("Received remote audio track");
        const remoteAudioEl = document.createElement("audio");
        remoteAudioEl.autoplay = true;
        remoteAudioEl.controls = false;
        remoteAudioEl.volume = 1.0;
        remoteAudioEl.playsInline = true;
        
        remoteAudioEl.srcObject = event.streams[0];
        document.body.appendChild(remoteAudioEl);
        
        audioConnectionRef.current.remoteAudioEl = remoteAudioEl;
        
        // Setup viseme player with audio element
        remoteAudioEl.addEventListener('loadeddata', () => {
          console.log("Audio element loaded");
        });
      };

      // Handle data channel messages
      dc.onmessage = (e) => {
        let msg: any;
        try {
          msg = JSON.parse(e.data);
        } catch (error) {
          return;
        }

        console.log("Received message:", msg.type);

        // Handle different message types for viseme generation
        if (msg.type === "response.output_audio_buffer.started") {
          console.log("🎵 Audio buffer started - preparing visemes");
        }

        if (msg.type === "response.transcript.complete" && msg.transcript) {
          console.log("📝 Transcript complete:", msg.transcript);
          
          // Generate visemes from transcript
          const visemeSequence = generateRealtimeVisemes(msg.transcript);
          
          if (visemePlayerRef.current && visemeSequence.length > 0) {
            visemePlayerRef.current.start(visemeSequence, audioConnectionRef.current.remoteAudioEl);
          }
        }

        // Handle direct viseme data if available
        if (msg.type === "response.viseme" || (msg.type === "response.event" && msg.event === "viseme")) {
          const viseme = msg.viseme || msg.phoneme || "sil";
          const value = msg.value || msg.confidence || 1.0;
          
          window.dispatchEvent(new CustomEvent("viseme", { 
            detail: { viseme, value } 
          }));
        }
      };

      dc.onopen = () => {
        console.log("Data channel opened");
        setIsConnected(true);
        setConnectionStatus("Connected");
        
        // Send session configuration
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: "Please be helpful and conversational. Keep responses concise but natural.",
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            }
          }
        };
        dc.send(JSON.stringify(sessionUpdate));
      };

      dc.onclose = () => {
        console.log("Data channel closed");
        setIsConnected(false);
        setConnectionStatus("Disconnected");
      };

      // Store references
      audioConnectionRef.current = { pc, dc, remoteAudioEl: null };

      // Create offer and connect
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-10-01';
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await response.text(),
      };
      
      await pc.setRemoteDescription(answer);

    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionStatus("Failed to connect");
    }
  };

  // Disconnect function
  const disconnect = (): void => {
    const { pc, dc, remoteAudioEl } = audioConnectionRef.current;
    
    if (visemePlayerRef.current) {
      visemePlayerRef.current.stop();
    }
    
    if (speechRecognitionRef.current && isRecording) {
      speechRecognitionRef.current.stop();
    }
    
    if (remoteAudioEl) {
      remoteAudioEl.remove();
    }
    
    if (dc) {
      dc.close();
    }
    
    if (pc) {
      pc.close();
    }
    
    audioConnectionRef.current = { pc: null, dc: null, remoteAudioEl: null };
    setIsConnected(false);
    setIsRecording(false);
    setConnectionStatus("Disconnected");
  };

  // Start/Stop Recording
  const toggleRecording = (): void => {
    if (!speechRecognitionRef.current) {
      setupSpeechRecognition();
    }

    if (isRecording) {
      speechRecognitionRef.current?.stop();
    } else {
      finalSentRef.current = false;
      speechRecognitionRef.current?.start();
    }
  };

  // Generate visemes from text (simplified version for real-time)
  const generateRealtimeVisemes = (text: string): any[] => {
    console.log("🎭 Generating visemes for text:", text);
    
    const words = text.toLowerCase().split(/\s+/);
    const visemes: any[] = [];
    let timeOffset = 0;
    
    words.forEach((word) => {
      const phonemes = estimatePhonemes(word);
      const wordDuration = Math.max(300, word.length * 80); // Minimum 300ms per word
      const phonemeDuration = wordDuration / Math.max(phonemes.length, 1);
      
      phonemes.forEach((phoneme, index) => {
        const startTime = timeOffset + (index * phonemeDuration);
        const endTime = startTime + phonemeDuration;
        
        visemes.push({
          phoneme: phonemeToViseme(phoneme),
          start: startTime,
          end: endTime
        });
      });
      
      timeOffset += wordDuration + 100; // 100ms pause between words
    });
    
    return visemes;
  };

  // Simple phoneme estimation
  const estimatePhonemes = (word: string): string[] => {
    const phonemes: string[] = [];
    const chars = word.toLowerCase().split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];
      
      // Simple mapping - this could be much more sophisticated
      switch (char) {
        case 'a': phonemes.push(nextChar === 'r' ? 'AA' : 'AE'); break;
        case 'e': phonemes.push('EH'); break;
        case 'i': phonemes.push('IH'); break;
        case 'o': phonemes.push('OW'); break;
        case 'u': phonemes.push('UH'); break;
        case 'p': case 'b': phonemes.push('P'); break;
        case 'f': case 'v': phonemes.push('F'); break;
        case 't': case 'd': phonemes.push('T'); break;
        case 'k': case 'g': phonemes.push('K'); break;
        case 's': case 'z': phonemes.push('S'); break;
        case 'r': phonemes.push('R'); break;
        case 'l': phonemes.push('L'); break;
        case 'm': phonemes.push('M'); break;
        case 'n': phonemes.push('N'); break;
        case 'h': phonemes.push('HH'); break;
        default: break;
      }
    }
    
    return phonemes.length > 0 ? phonemes : ['sil'];
  };

  // Convert phoneme to viseme
  const phonemeToViseme = (phoneme: string): string => {
    const mapping: { [key: string]: string } = {
      'P': 'viseme_PP', 'B': 'viseme_PP', 'M': 'viseme_PP',
      'F': 'viseme_FF', 'V': 'viseme_FF',
      'T': 'viseme_DD', 'D': 'viseme_DD', 'L': 'viseme_DD',
      'K': 'viseme_kk', 'G': 'viseme_kk',
      'S': 'viseme_SS', 'Z': 'viseme_SS',
      'R': 'viseme_RR',
      'AA': 'viseme_aa', 'AE': 'viseme_aa',
      'EH': 'viseme_E',
      'IH': 'viseme_I',
      'OW': 'viseme_O',
      'UH': 'viseme_U',
      'N': 'viseme_nn',
      'sil': 'viseme_sil'
    };
    
    return mapping[phoneme] || 'viseme_sil';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            AI Avatar Conversation
          </h1>
          
          {/* Connection Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={isConnected ? disconnect : connectToOpenAI}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect to AI'}
            </button>
            
            <button
              onClick={toggleRecording}
              disabled={!isConnected}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isConnected
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>

          {/* Status Display */}
          <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg">
            <div className={`flex items-center gap-2 ${
              connectionStatus === 'Connected' ? 'text-green-600' : 
              connectionStatus === 'Connecting...' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'Connected' ? 'bg-green-500' : 
                connectionStatus === 'Connecting...' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium">{connectionStatus}</span>
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Recording...</span>
              </div>
            )}
          </div>

          {/* Live Text Display */}
          {liveText && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <p className="text-blue-800">
                <span className="font-semibold">You're saying:</span> {liveText}
              </p>
            </div>
          )}
        </div>

        {/* Avatar Display */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <RPMAvatar3D
            character="AI Assistant"
            isListening={isRecording}
            isSpeaking={false}
            audioLevel={0}
            avatarUrl="https://models.readyplayer.me/68b61ace83ef17237fd6e69f.glb?pose=T&morphTargets=ARKit,Oculus%20Visemes&textureAtlas=1024"
            realtimeDC={audioConnectionRef.current.dc}
            onPhonemeSink={(data) => {
              console.log("Viseme sink:", data);
            }}
          />
        </div>
      </div>
    </div>
  );
}