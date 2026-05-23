"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Mic, MicOff, Square, Volume2, VolumeX, ChevronDown } from "lucide-react";

import { useAuthStore } from "@/lib/store/authStore";
import { useDeepgramSTT } from "@/lib/hooks/useDeepgramSTT";
import { useDeepgramTTS } from "@/lib/hooks/useDeepgramTTS";
import { getDeepgramToken, askVoiceQuestion } from "@/lib/api/voice.api";
import type { VoiceMessage } from "@/lib/api/voice.api";

const SUBJECTS = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Medicine",
  "Surgery",
  "Cardiology",
  "Community Medicine",
  "Pediatrics",
  "Obstetrics and Gynecology",
];

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceAgentPage() {
  const token = useAuthStore((state) => state.accessToken);

  const [deepgramToken, setDeepgramToken] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [subject, setSubject] = useState("Anatomy");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSubmittedTextRef = useRef("");

  const stt = useDeepgramSTT(deepgramToken);
  const tts = useDeepgramTTS();

  useEffect(() => {
    if (!token) {
      return;
    }
    getDeepgramToken(token)
      .then((data) => {
        setDeepgramToken(data.token);
      })
      .catch((caughtError: unknown) => {
        const message = caughtError instanceof Error ? caughtError.message : "Failed to connect to voice service";
        setTokenError(message);
      });
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || !token) {
        return;
      }

      const normalized = text.trim();
      if (normalized === lastSubmittedTextRef.current) {
        return;
      }
      lastSubmittedTextRef.current = normalized;

      const userMessage: VoiceMessage = {
        role: "user",
        content: normalized,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setVoiceState("thinking");

      try {
        const response = await askVoiceQuestion(token, normalized, messages, subject, sessionId);

        const assistantMessage: VoiceMessage = {
          role: "assistant",
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (autoSpeak) {
          setVoiceState("speaking");
          await tts.speak(response, token);
          setVoiceState("idle");
        } else {
          setVoiceState("idle");
        }
      } catch {
        setVoiceState("idle");
      }
    },
    [autoSpeak, messages, sessionId, subject, token, tts],
  );

  const handleMicClick = useCallback(async () => {
    if (!deepgramToken) {
      return;
    }

    if (voiceState === "listening") {
      stt.stopListening();
      const finalText = (stt.transcript || stt.interimTranscript).trim();
      if (finalText) {
        await handleSendTranscript(finalText);
      } else {
        setVoiceState("idle");
      }
      stt.resetTranscript();
      return;
    }

    if (voiceState === "speaking") {
      tts.stop();
      setVoiceState("idle");
      return;
    }

    if (voiceState === "idle") {
      setVoiceState("listening");
      await stt.startListening();
    }
  }, [deepgramToken, handleSendTranscript, stt, tts, voiceState]);

  useEffect(() => {
    if (!stt.isListening && voiceState === "listening" && stt.transcript) {
      void handleSendTranscript(stt.transcript);
      stt.resetTranscript();
    }
  }, [stt.isListening, voiceState, stt.transcript, handleSendTranscript, stt]);

  useEffect(() => {
    if (tts.isSpeaking) {
      setVoiceState("speaking");
      return;
    }
    if (voiceState === "speaking") {
      setVoiceState("idle");
    }
  }, [tts.isSpeaking, voiceState]);

  useEffect(() => {
    return () => {
      stt.stopListening();
      tts.stop();
    };
  }, [stt, tts]);

  const getMicIcon = () => {
    if (voiceState === "listening") {
      return <MicOff size={32} strokeWidth={1.5} />;
    }
    if (voiceState === "speaking") {
      return <Square size={32} strokeWidth={1.5} />;
    }
    return <Mic size={32} strokeWidth={1.5} />;
  };

  const getMicColor = () => {
    if (voiceState === "listening") {
      return "border-red-400 bg-red-400/10 text-red-400";
    }
    if (voiceState === "speaking") {
      return "border-[#d5c5a8] bg-[#d5c5a8]/10 text-[#d5c5a8]";
    }
    return "border-[#353534] bg-[#1f1f1f] text-[#e5e2e1] hover:border-[#d5c5a8]/60";
  };

  return (
    <div className="aa-anim-fade-up flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-[var(--aa-r-xl)] border border-[var(--aa-border)] bg-[var(--aa-bg)]">
      <div className="flex items-center justify-between border-b border-[#353534] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d5c5a8]/10">
            <Brain size={16} className="text-[#d5c5a8]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#fff2de]">Voice Agent</h1>
            <p className="text-xs text-[#b7ada0]">Powered by Deepgram + Groq</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="appearance-none rounded-lg border border-[#4c463d] bg-[#1a1a1a] px-3 py-1.5 pr-8 text-xs text-[#e5e2e1] outline-none"
            >
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#cec5b9]" />
          </div>

          <button
            onClick={() => setAutoSpeak((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
              autoSpeak ? "border-[#d5c5a8]/40 text-[#d5c5a8]" : "border-[#353534] text-[#cec5b9]"
            }`}
          >
            {autoSpeak ? <Volume2 size={12} strokeWidth={1.9} /> : <VolumeX size={12} strokeWidth={1.9} />}
            {autoSpeak ? "Sound on" : "Sound off"}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Brain size={64} strokeWidth={0.5} className="mb-4 select-none text-[#d5c5a8]/20" />
            <h2 className="mb-2 text-2xl font-bold text-[#fff2de]">Ready to study out loud?</h2>
            <p className="max-w-sm text-sm text-[#cec5b9]">
              Tap the microphone and ask AlmondAI anything about {subject}. Perfect for late night study sessions.
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={`${message.timestamp}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" ? (
              <div className="mr-3 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
                <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
              </div>
            ) : null}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "rounded-br-sm border border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]"
                  : "rounded-bl-sm border border-[#353534] bg-[#1f1f1f] text-[#e5e2e1]"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {voiceState === "thinking" ? (
          <div className="flex justify-start">
            <div className="mr-3 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
              <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-[#353534] bg-[#1f1f1f] px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8]/60" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8]/60" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8]/60" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#353534] px-6 py-6">
        <p className="mb-4 h-4 text-center text-xs text-[#b7ada0]">
          {voiceState === "idle" ? "Tap the microphone to speak" : null}
          {voiceState === "listening" ? <span className="text-red-400">{stt.interimTranscript || "Listening..."}</span> : null}
          {voiceState === "thinking" ? "AlmondAI is thinking..." : null}
          {voiceState === "speaking" ? "AlmondAI is speaking - tap to stop" : null}
        </p>

        {voiceState === "listening" ? (
          <div className="mb-4 flex h-8 items-end justify-center gap-1">
            {[0, 1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className="w-1 rounded-full bg-red-400"
                style={{ animation: "voiceWave 1s ease-in-out infinite", animationDelay: `${bar * 150}ms`, height: "8px" }}
              />
            ))}
          </div>
        ) : null}

        <div className="flex justify-center">
          <button
            onClick={() => {
              void handleMicClick();
            }}
            disabled={!deepgramToken || voiceState === "thinking"}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${getMicColor()} ${
              voiceState === "listening" ? "scale-110 animate-pulse" : "hover:scale-105"
            }`}
          >
            {getMicIcon()}
          </button>
        </div>

        {(stt.error || tts.error || tokenError) ? (
          <p className="mt-3 text-center text-xs text-red-400">{stt.error || tts.error || tokenError}</p>
        ) : null}

        {messages.length > 0 ? (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setMessages([]);
                setSessionId(undefined);
                stt.resetTranscript();
              }}
              className="text-xs text-[#b7ada0] transition-colors hover:text-[#cec5b9]"
            >
              Clear conversation
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
