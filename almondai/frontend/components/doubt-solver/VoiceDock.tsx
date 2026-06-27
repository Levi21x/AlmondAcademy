"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, Loader2, Mic, Radio, Square, Volume2 } from "lucide-react";

import type { SessionState } from "@/lib/hooks/useVoiceSession";

// ─── Waveform ─────────────────────────────────────────────────────────────────

const BARS = 11;

function DockWaveform({ level, state }: { level: number; state: SessionState }) {
  const active = state === "listening" || state === "recording" || state === "speaking";
  const barColor =
    state === "recording" ? "#f87171"
    : state === "speaking" ? "#d5c5a8"
    : "#4c463d";

  return (
    <div className="flex h-5 items-center justify-center gap-[2.5px]">
      {Array.from({ length: BARS }, (_, i) => {
        const distFromCenter = Math.abs(i - Math.floor(BARS / 2));
        const base = 0.28 + (1 - distFromCenter / (BARS / 2)) * 0.42;
        const jitter = Math.sin((i + 1) * 1.7) * 0.08;
        const h = active
          ? 3 + (base + jitter + level * 0.55) * 16
          : 2 + base * 3;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{ width: 2.5, height: Math.round(h), background: barColor }}
          />
        );
      })}
    </div>
  );
}

// ─── State labels + icons ─────────────────────────────────────────────────────

const LABEL: Record<SessionState, string> = {
  inactive:   "Voice mode ready",
  loading:    "Starting microphone…",
  listening:  "Listening…",
  recording:  "Hearing you…",
  processing: "Dr. Almond is thinking…",
  speaking:   "Speaking — talk over me to interrupt",
};

function StateIcon({ state }: { state: SessionState }) {
  if (state === "loading")    return <Loader2   size={11} strokeWidth={2} className="animate-spin" />;
  if (state === "listening")  return <Radio     size={11} strokeWidth={2} className="animate-pulse" />;
  if (state === "recording")  return <Mic       size={11} strokeWidth={2} />;
  if (state === "processing") return <Brain     size={11} strokeWidth={2} />;
  if (state === "speaking")   return <Volume2   size={11} strokeWidth={2} />;
  return <Mic size={11} strokeWidth={2} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VoiceDockProps {
  state:             SessionState;
  audioLevel:        number;
  liveCaption:       string;
  partialTranscript: string;
  error:             string | null;
  onStop:            () => void;
}

export function VoiceDock({
  state,
  audioLevel,
  liveCaption,
  partialTranscript,
  error,
  onStop,
}: VoiceDockProps) {
  const stateColor =
    state === "recording" ? "#f87171"
    : state === "speaking" ? "#d5c5a8"
    : "#b7ada0";

  const caption = liveCaption || partialTranscript;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      style={{
        marginBottom: 8,
        borderRadius: "var(--aa-r-lg)",
        border: `1px solid ${state === "recording" ? "rgba(248,113,113,0.25)" : state === "speaking" ? "rgba(213,197,168,0.25)" : "var(--aa-border)"}`,
        background: "var(--aa-s1)",
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
        {/* State label */}
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: stateColor, whiteSpace: "nowrap", flexShrink: 0 }}>
          <StateIcon state={state} />
          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {LABEL[state]}
          </span>
        </span>

        {/* Waveform — fills middle */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <DockWaveform level={audioLevel} state={state} />
        </div>

        {/* Stop button */}
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop voice mode"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            borderRadius: "var(--aa-r-full)",
            border: "1px solid var(--aa-border)",
            background: "var(--aa-s2)",
            padding: "5px 12px",
            fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 600,
            color: "var(--aa-text-3)",
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(228,180,160,0.4)"; e.currentTarget.style.color = "#e4b4a0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border)"; e.currentTarget.style.color = "var(--aa-text-3)"; }}
        >
          <Square size={9} strokeWidth={2.5} />
          Stop
        </button>
      </div>

      {/* Live caption strip */}
      <AnimatePresence>
        {caption ? (
          <motion.div
            key="caption"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--aa-border)", padding: "7px 16px" }}
          >
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: liveCaption ? "var(--aa-text-2)" : "var(--aa-text-3)", lineHeight: 1.5, margin: 0 }}>
              {caption}
              {(state === "speaking" || state === "recording") ? (
                <span
                  className="animate-pulse"
                  style={{ display: "inline-block", width: 1.5, height: 12, background: "var(--aa-amber)", marginLeft: 2, verticalAlign: "middle" }}
                />
              ) : null}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Error strip */}
      {error ? (
        <div style={{ borderTop: "1px solid rgba(90,47,42,0.5)", background: "#2c1d1b", padding: "7px 16px" }}>
          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "#e4b4a0", margin: 0 }}>{error}</p>
        </div>
      ) : null}
    </motion.div>
  );
}
