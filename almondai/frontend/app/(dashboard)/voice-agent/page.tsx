"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Mic, MicOff, Square, Volume2, VolumeX, ChevronDown, AlertCircle } from "lucide-react";

import { useAuthStore } from "@/lib/store/authStore";
import { useSarvamSTT } from "@/lib/hooks/useSarvamSTT";
import { useCartesiaTTS } from "@/lib/hooks/useCartesiaTTS";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import { askVoiceQuestion, checkVoiceHealth } from "@/lib/api/voice.api";
import type { VoiceMessage } from "@/lib/api/voice.api";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function generateSessionId(): string {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Waveform bar — driven by live audio level from Web Audio AnalyserNode
// ---------------------------------------------------------------------------
function AudioWaveform({ level, bars = 5 }: { level: number; bars?: number }) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const center = (bars - 1) / 2;
    const distance = Math.abs(i - center) / center; // 0 at center, 1 at edges
    const factor = 1 - distance * 0.5;
    return Math.max(4, Math.min(32, level * 32 * factor + Math.random() * 4));
  });

  return (
    <div className="flex h-8 items-end justify-center gap-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-red-400 transition-all duration-75"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function VoiceAgentPage() {
  const token = useAuthStore((state) => state.accessToken);
  const { subjects: subjectList, loaded: subjectsLoaded } = useSubjectList();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [subject, setSubject] = useState("Anatomy");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [providerError, setProviderError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep a ref to messages so handleSendTranscript always sees current history
  // without the stale-closure bug that useCallback + deps creates
  const messagesRef = useRef<VoiceMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const stt = useSarvamSTT(token ?? "");
  const tts = useCartesiaTTS();

  // Sync subject list
  useEffect(() => {
    if (!subjectsLoaded || subjectList.length === 0) return;
    if (!subjectList.includes(subject)) setSubject(subjectList[0]);
  }, [subjectsLoaded, subjectList, subject]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Health check on mount — warn if any provider key is missing
  useEffect(() => {
    if (!token) return;
    checkVoiceHealth(token).then((h) => {
      const missing: string[] = [];
      if (!h.sarvam) missing.push("Sarvam (STT)");
      if (!h.groq) missing.push("Groq (LLM)");
      if (!h.cartesia) missing.push("Cartesia (TTS)");
      if (missing.length > 0) {
        setProviderError(`Voice service unavailable: ${missing.join(", ")} key not configured.`);
      }
    }).catch(() => {
      // Health check failure is non-fatal — don't block the UI
    });
  }, [token]);

  // Sync TTS speaking state → voiceState
  useEffect(() => {
    if (tts.isSpeaking) {
      setVoiceState("speaking");
      return;
    }
    if (voiceState === "speaking") {
      setVoiceState("idle");
    }
  }, [tts.isSpeaking, voiceState]);

  const handleSendTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || !token) return;

      const normalized = text.trim();
      const userMessage: VoiceMessage = {
        role: "user",
        content: normalized,
        timestamp: new Date().toISOString(),
      };

      // Use ref so we always send the real current history, not a stale snapshot
      const currentHistory = messagesRef.current;
      setMessages((prev) => [...prev, userMessage]);
      setVoiceState("thinking");

      try {
        const result = await askVoiceQuestion(token, normalized, currentHistory, subject, sessionId);

        // Keep server-assigned session ID for this conversation thread
        if (result.sessionId && result.sessionId !== sessionId) {
          setSessionId(result.sessionId);
        }

        const assistantMessage: VoiceMessage = {
          role: "assistant",
          content: result.textResponse,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (autoSpeak) {
          setVoiceState("speaking");
          await tts.speak(result.textResponse, token);
          setVoiceState("idle");
        } else {
          setVoiceState("idle");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setProviderError(msg);
        setVoiceState("idle");
      }
    },
    [autoSpeak, sessionId, subject, token, tts],
  );

  const handleMicClick = useCallback(async () => {
    if (!token) return;

    if (voiceState === "listening") {
      // Stop recording → transcribe → send
      setVoiceState("thinking");
      const finalText = await stt.stopListening();
      if (finalText) {
        await handleSendTranscript(finalText);
      } else {
        setVoiceState("idle");
      }
      return;
    }

    if (voiceState === "speaking") {
      tts.stop();
      setVoiceState("idle");
      return;
    }

    if (voiceState === "idle") {
      setProviderError(null);
      setVoiceState("listening");
      await stt.startListening();
      // If startListening failed (e.g. mic denied), stt.error is set
      if (stt.error) setVoiceState("idle");
    }
  }, [token, voiceState, stt, tts, handleSendTranscript]);

  // Cleanup on unmount
  useEffect(() => () => { stt.cancel(); tts.stop(); }, [stt, tts]);

  // ---------- Derived UI state ----------
  const getMicIcon = () => {
    if (voiceState === "listening") return <MicOff size={32} strokeWidth={1.5} />;
    if (voiceState === "speaking") return <Square size={32} strokeWidth={1.5} />;
    return <Mic size={32} strokeWidth={1.5} />;
  };

  const getMicStyle = () => {
    if (voiceState === "listening") return "border-red-400 bg-red-400/10 text-red-400";
    if (voiceState === "speaking") return "border-[#d5c5a8] bg-[#d5c5a8]/10 text-[#d5c5a8]";
    return "border-[#353534] bg-[#1f1f1f] text-[#e5e2e1] hover:border-[#d5c5a8]/60";
  };

  const getMicAnimation = () => {
    if (voiceState === "listening") return "scale-110 ring-2 ring-red-400/30 ring-offset-2 ring-offset-[#1f1f1f]";
    return "hover:scale-105";
  };

  const statusText = () => {
    if (voiceState === "listening") return <span className="text-red-400">Listening — tap again to send</span>;
    if (voiceState === "thinking" && stt.isTranscribing) return <span className="text-[#d5c5a8]/70">Transcribing...</span>;
    if (voiceState === "thinking") return <span className="text-[#d5c5a8]/70">Dr. Almond is thinking...</span>;
    if (voiceState === "speaking") return <span className="text-[#d5c5a8]">Speaking — tap to stop</span>;
    return <span>Tap the microphone to ask a question</span>;
  };

  const isMicDisabled = !token || voiceState === "thinking" || !!providerError;

  return (
    <div className="aa-anim-fade-up flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-[var(--aa-r-xl)] border border-[var(--aa-border)] bg-[var(--aa-bg)]">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#353534] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d5c5a8]/10">
            <Brain size={16} className="text-[#d5c5a8]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#fff2de]">Dr. Almond</h1>
            <p className="text-xs text-[#b7ada0]">Your Medical Mentor</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="appearance-none rounded-lg border border-[#4c463d] bg-[#1a1a1a] px-3 py-1.5 pr-8 text-xs text-[#e5e2e1] outline-none"
            >
              {subjectList.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#cec5b9]" />
          </div>

          <button
            onClick={() => setAutoSpeak((p) => !p)}
            className={`aa-press flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
              autoSpeak ? "border-[#d5c5a8]/40 text-[#d5c5a8]" : "border-[#353534] text-[#cec5b9]"
            }`}
          >
            {autoSpeak ? <Volume2 size={12} strokeWidth={1.9} /> : <VolumeX size={12} strokeWidth={1.9} />}
            {autoSpeak ? "Sound on" : "Sound off"}
          </button>
        </div>
      </div>

      {/* Provider error banner */}
      {providerError ? (
        <div className="flex items-center gap-2 border-b border-red-900/40 bg-red-900/10 px-6 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {providerError}
        </div>
      ) : null}

      {/* Conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Brain size={56} strokeWidth={0.5} className="mb-5 select-none text-[#d5c5a8]/15" />
            <h2 className="mb-2 text-xl font-semibold text-[#fff2de]">Ask Dr. Almond anything</h2>
            <p className="max-w-xs text-sm text-[#cec5b9]">
              Tap the mic and speak your question about {subject}. Dr. Almond answers like a brilliant senior doctor
              sitting beside you — concise, clear, and human.
            </p>
            <div className="mt-6 flex flex-col items-start gap-2 rounded-xl border border-[#353534] bg-[#1a1a1a] px-5 py-4 text-left">
              <p className="text-xs font-medium text-[#b7ada0]">Try asking:</p>
              {[
                `Explain the brachial plexus simply`,
                `What's the most tested topic in ${subject}?`,
                `I keep forgetting the cranial nerves. Help.`,
              ].map((q) => (
                <p key={q} className="text-xs text-[#7a7068]">"{q}"</p>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`aa-anim-fade-up flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" ? (
              <div className="mr-3 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
                <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
              </div>
            ) : null}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "rounded-br-sm border border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]"
                  : "rounded-bl-sm border border-[#353534] bg-[#1a1a1a] text-[#e5e2e1]"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {voiceState === "thinking" ? (
          <div className="flex justify-start">
            <div className="mr-3 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
              <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-[#353534] bg-[#1a1a1a] px-4 py-3">
              <span className="inline-flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8]/50"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="border-t border-[#353534] px-6 pb-6 pt-4">
        <p className="mb-3 h-4 text-center text-xs text-[#b7ada0]">
          {statusText()}
        </p>

        {/* Live audio waveform */}
        {voiceState === "listening" ? (
          <div className="mb-4">
            <AudioWaveform level={stt.audioLevel} bars={7} />
          </div>
        ) : null}

        {/* Microphone button */}
        <div className="flex justify-center">
          <button
            onClick={() => { void handleMicClick(); }}
            disabled={isMicDisabled}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${getMicStyle()} ${getMicAnimation()}`}
          >
            {getMicIcon()}
          </button>
        </div>

        {/* STT / TTS errors */}
        {(stt.error && !providerError) ? (
          <p className="mt-3 text-center text-xs text-red-400">{stt.error}</p>
        ) : null}
        {(tts.error && !providerError) ? (
          <p className="mt-3 text-center text-xs text-red-400">{tts.error}</p>
        ) : null}

        {/* Clear */}
        {messages.length > 0 ? (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setMessages([]);
                setSessionId(generateSessionId());
                setProviderError(null);
              }}
              className="text-xs text-[#b7ada0] transition-colors hover:text-[#cec5b9]"
            >
              New conversation
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
