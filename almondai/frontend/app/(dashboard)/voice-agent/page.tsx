"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  Mic,
  Volume2,
  ChevronDown,
  AlertCircle,
  Radio,
  Loader2,
  Headphones,
} from "lucide-react";

import { useAuthStore } from "@/lib/store/authStore";
import { useVoiceSession } from "@/lib/hooks/useVoiceSession";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import type { VoiceMessage } from "@/lib/api/voice.api";

function generateSessionId() {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Waveform: bars driven by live mic RMS across all active states ───────────
function Waveform({ level, state }: { level: number; state: string }) {
  const BARS = 9;

  const isActive = state !== "inactive";
  const barColor =
    state === "recording" ? "bg-red-400"
    : state === "speaking" ? "bg-[#d5c5a8]"
    : isActive             ? "bg-[#4c463d]"
    : "bg-[#2a2a2a]";

  return (
    <div className="flex h-8 items-center justify-center gap-[3px]">
      {Array.from({ length: BARS }, (_, i) => {
        const distFromCenter = Math.abs(i - Math.floor(BARS / 2));
        const base  = 0.3 + (1 - distFromCenter / (BARS / 2)) * 0.4;
        const jitter = Math.sin((i + 1) * 1.9) * 0.12;
        let height: number;

        if (!isActive || state === "processing") {
          height = 3 + base * 3;
        } else {
          // Show live mic levels in listening/recording/speaking states
          height = 4 + (base + jitter + level * 0.65) * 26;
        }

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${barColor}`}
            style={{ height: `${Math.round(height)}px` }}
          />
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VoiceAgentPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { subjects: subjectList, loaded: subjectsLoaded } = useSubjectList();

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [subject, setSubject] = useState("Anatomy");
  const [sessionId, setSessionId] = useState(generateSessionId);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync subject list
  useEffect(() => {
    if (!subjectsLoaded || !subjectList.length) return;
    if (!subjectList.includes(subject)) setSubject(subjectList[0]);
  }, [subjectsLoaded, subjectList, subject]);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewMessage = useCallback((msg: VoiceMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { state, error, audioLevel, partialTranscript, liveCaption, startSession, stopSession, resetHistory } =
    useVoiceSession({
      authToken: token ?? "",
      subject,
      sessionId,
      onMessage: handleNewMessage,
      onSessionId: setSessionId,
    });

  const isActive = state !== "inactive";
  const isBusy = state === "loading";

  // Keep the latest streaming text in view
  useEffect(() => {
    if (liveCaption || partialTranscript) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveCaption, partialTranscript]);

  const handleToggle = useCallback(() => {
    if (isActive) {
      stopSession();
    } else {
      void startSession();
    }
  }, [isActive, startSession, stopSession]);

  const handleNewConversation = useCallback(() => {
    stopSession();
    setMessages([]);
    setSessionId(generateSessionId());
    resetHistory();
  }, [stopSession, resetHistory]);

  // ─── Derived UI helpers ─────────────────────────────────────────────────

  const buttonIcon = () => {
    if (state === "loading") return <Loader2 size={28} strokeWidth={1.5} className="animate-spin" />;
    if (state === "inactive") return <Mic size={30} strokeWidth={1.5} />;
    if (state === "listening") return <Radio size={28} strokeWidth={1.5} className="animate-pulse" />;
    if (state === "recording") return <Mic size={28} strokeWidth={1.5} />;
    if (state === "processing") return <Brain size={28} strokeWidth={1.5} className="animate-spin" style={{ animationDuration: "2s" }} />;
    if (state === "speaking") return <Volume2 size={28} strokeWidth={1.5} />;
    return <Mic size={30} strokeWidth={1.5} />;
  };

  const buttonStyle = () => {
    if (!isActive)
      return "border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1] hover:border-[#d5c5a8]/60 hover:bg-[#d5c5a8]/5 hover:scale-105";
    if (state === "loading")
      return "border-[#d5c5a8]/30 bg-[#1f1f1f] text-[#d5c5a8]/50";
    if (state === "listening")
      return "border-[#d5c5a8]/50 bg-[#d5c5a8]/8 text-[#d5c5a8] ring-4 ring-[#d5c5a8]/10";
    if (state === "recording")
      return "border-red-400 bg-red-400/10 text-red-400 scale-110 ring-4 ring-red-400/20";
    if (state === "processing")
      return "border-[#d5c5a8]/40 bg-[#1f1f1f] text-[#d5c5a8]/60";
    if (state === "speaking")
      return "border-[#d5c5a8] bg-[#d5c5a8]/10 text-[#d5c5a8] ring-4 ring-[#d5c5a8]/15";
    return "border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]";
  };

  const statusText = () => {
    if (!token) return "Sign in to use Dr. Almond";
    if (state === "loading") return "Warming up the microphone…";
    if (state === "inactive") return "Tap to start voice session";
    if (state === "listening") return "Listening… just start speaking";
    if (state === "recording") return "Listening to you…";
    if (state === "processing") return "Dr. Almond is thinking…";
    if (state === "speaking") return "Speaking — talk over me to interrupt";
    return "";
  };

  return (
    <div className="aa-anim-fade-up flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-[var(--aa-r-xl)] border border-[var(--aa-border)] bg-[var(--aa-bg)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#353534] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d5c5a8]/10">
            <Brain size={16} className="text-[#d5c5a8]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#fff2de]">Dr. Almond</h1>
            <p className="text-xs text-[#b7ada0]">Medical Mentor · Voice Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Subject selector */}
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
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#cec5b9]"
            />
          </div>

          {/* Headphones hint — improves barge-in / prevents echo on speakers */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-[#353534] px-2.5 py-1.5 text-xs text-[#b7ada0] sm:flex">
            <Headphones size={12} strokeWidth={1.9} />
            Headphones recommended
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error ? (
        <div className="flex items-center gap-2 border-b border-red-900/40 bg-red-900/10 px-6 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ── Conversation ────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">

        {/* Empty state */}
        {messages.length === 0 && state === "inactive" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Brain size={56} strokeWidth={0.5} className="mb-5 select-none text-[#d5c5a8]/15" />
            <h2 className="mb-2 text-xl font-semibold text-[#fff2de]">Ask Dr. Almond anything</h2>
            <p className="max-w-xs text-sm text-[#cec5b9]">
              Tap the mic to activate voice mode. Just speak naturally — Dr. Almond listens and
              responds like a brilliant senior doctor sitting beside you.
            </p>
            <div className="mt-6 flex flex-col items-start gap-2 rounded-xl border border-[#353534] bg-[#1a1a1a] px-5 py-4 text-left">
              <p className="text-xs font-medium text-[#b7ada0]">Try asking:</p>
              {[
                "Explain the brachial plexus simply",
                `What's the most high-yield topic in ${subject}?`,
                "I keep mixing up cranial nerves — help me remember",
              ].map((q) => (
                <p key={q} className="text-xs text-[#7a7068]">&ldquo;{q}&rdquo;</p>
              ))}
            </div>
          </div>
        ) : null}

        {/* Session active, no messages yet */}
        {messages.length === 0 && state !== "inactive" ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Radio size={32} strokeWidth={1} className="text-[#d5c5a8]/30 animate-pulse" />
              <p className="text-sm text-[#7a7068]">Session active — speak when ready</p>
            </div>
          </div>
        ) : null}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`aa-anim-fade-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" ? (
              <div className="mr-3 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
                <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
              </div>
            ) : null}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm border border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]"
                  : "rounded-bl-sm border border-[#353534] bg-[#1a1a1a] text-[#e5e2e1]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live streaming caption — assistant sentences as they arrive */}
        {liveCaption ? (
          <div className="aa-anim-fade-up flex justify-start">
            <div className="mr-3 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
              <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
            </div>
            <div className="max-w-[78%] rounded-2xl rounded-bl-sm border border-[#d5c5a8]/25 bg-[#1a1a1a] px-4 py-3 text-sm leading-relaxed text-[#e5e2e1]">
              {liveCaption}
              {state === "speaking" ? (
                <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[#d5c5a8] align-middle" />
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Thinking indicator — only before the first sentence lands */}
        {state === "processing" && !liveCaption ? (
          <div className="flex justify-start">
            <div className="mr-3 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#d5c5a8]/10">
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

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="border-t border-[#353534] px-6 pb-6 pt-5">

        {/* Status text */}
        <p className="mb-3 h-4 text-center text-xs text-[#b7ada0]">
          {statusText()}
        </p>

        {/* Waveform */}
        <div className="mb-4">
          <Waveform level={audioLevel} state={state} />
        </div>

        {/* Toggle button — single click to activate / deactivate */}
        <div className="flex justify-center">
          <button
            onClick={handleToggle}
            disabled={!token || isBusy}
            aria-label={isActive ? "Stop voice session" : "Start voice session"}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${buttonStyle()}`}
          >
            {buttonIcon()}
          </button>
        </div>

        {/* Session active indicator */}
        {isActive ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#d5c5a8]/50">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#d5c5a8]/50" />
            Voice session active · tap to end
          </p>
        ) : null}

        {/* New conversation */}
        {messages.length > 0 ? (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleNewConversation}
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
