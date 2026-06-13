"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";

import type { VoiceMessage } from "@/lib/api/voice.api";
import { encodeWavFromFloat32 } from "@/lib/audio/encodeWav";
import { StreamingAudioPlayer } from "@/lib/audio/StreamingAudioPlayer";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SessionState =
  | "inactive"    // session off
  | "loading"     // VAD model loading / mic init
  | "listening"   // mic open, Silero waiting for speech
  | "recording"   // confirmed speech, capturing
  | "processing"  // utterance sent, awaiting transcript + first audio
  | "speaking";   // TTS streaming back / playing

export interface UseVoiceSessionOptions {
  authToken:   string;
  subject:     string;
  sessionId:   string;
  onMessage:   (msg: VoiceMessage) => void;
  onSessionId: (id: string) => void;
}

export interface LatencyStats {
  stt_ms:                    number | null;
  llm_first_sentence_ms:     number | null;
  first_tts_ms:              number | null;
  time_to_first_audio_ms:    number | null;
  total_ms:                  number;
  sentence_tts_ms:           number[];
  audio_bytes:               number;
}

export interface UseVoiceSessionReturn {
  state:             SessionState;
  /** true once the WebSocket is pre-connected and VAD assets are cached */
  isReady:           boolean;
  error:             string | null;
  audioLevel:        number;
  partialTranscript: string;
  liveCaption:       string;
  latency:           LatencyStats | null;
  startSession:      () => Promise<void>;
  stopSession:       () => void;
  resetHistory:      () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VAD_OPTS = {
  model: "v5" as const,
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.4,
  redemptionMs: 800,
  minSpeechMs: 250,
  preSpeechPadMs: 200,
};

// Pre-fetching these puts them in the browser disk cache so MicVAD.new()
// loads from cache instead of the network on the user's first tap.
const VAD_PREFETCH_ASSETS = [
  "/vad/silero_vad_v5.onnx",
  "/vad/ort-wasm-simd-threaded.wasm",
  "/vad/ort-wasm-simd-threaded.mjs",
  "/vad/vad.worklet.bundle.min.js",
];

const PING_MS = 25_000; // keep idle WS alive — backend closes at ~30s

function wsUrlFromApiBase(apiBase: string): string {
  return apiBase.replace(/^http/, "ws");
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceSession(opts: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [state, setState]               = useState<SessionState>("inactive");
  const [isReady, setIsReady]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [audioLevel, setLevel]          = useState(0);
  const [latency, setLatency]           = useState<LatencyStats | null>(null);
  const [partialTranscript, setPartial] = useState("");
  const [liveCaption, setLiveCaption]   = useState("");

  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const stateRef = useRef<SessionState>("inactive");
  const go = useCallback((s: SessionState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const vadRef          = useRef<MicVAD | null>(null);
  const wsRef           = useRef<WebSocket | null>(null);
  const playerRef       = useRef<StreamingAudioPlayer | null>(null);
  const historyRef      = useRef<VoiceMessage[]>([]);
  const turnTextRef     = useRef("");
  const lastLevelRef    = useRef(0);
  const pingTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // true while VAD is running — gates whether WS drops show an error
  const sessionActiveRef = useRef(false);

  // ─── WebSocket message handler ──────────────────────────────────────────

  const sendCancel = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "cancel" }));
    }
  }, []);

  const handleWsMessage = useCallback((raw: string) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }
    const type = msg.type as string;

    if (type === "pong") return; // keepalive ack

    if (type === "transcript") {
      const text = String(msg.text ?? "").trim();
      setPartial(text);
      if (text) {
        const userMsg: VoiceMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
        historyRef.current = [...historyRef.current, userMsg];
        optsRef.current.onMessage(userMsg);
      } else if (stateRef.current === "processing") {
        go("listening");
      }
      const sid = msg.session_id as string | undefined;
      if (sid && sid !== optsRef.current.sessionId) optsRef.current.onSessionId(sid);

    } else if (type === "sentence") {
      const text = String(msg.text ?? "");
      turnTextRef.current = turnTextRef.current ? `${turnTextRef.current} ${text}` : text;
      setLiveCaption(turnTextRef.current);

    } else if (type === "audio") {
      const player = playerRef.current;
      if (player) {
        if (stateRef.current !== "recording") go("speaking");
        player.enqueue(base64ToArrayBuffer(String(msg.data ?? "")));
      }

    } else if (type === "done") {
      const full = String(msg.full_text ?? "").trim();
      if (full) {
        const aiMsg: VoiceMessage = { role: "assistant", content: full, timestamp: new Date().toISOString() };
        historyRef.current = [...historyRef.current, aiMsg];
        optsRef.current.onMessage(aiMsg);
      }
      turnTextRef.current = "";
      setLiveCaption("");
      const player = playerRef.current;
      if (stateRef.current !== "recording" && !(player && player.isPlaying)) {
        go("listening");
      }

    } else if (type === "timing") {
      setLatency(msg.timing as LatencyStats);

    } else if (type === "error") {
      setError(String(msg.message ?? "Voice service error."));
      if (stateRef.current !== "recording") go("listening");
    }
  }, [go]);

  // ─── Open WebSocket (low-level) ──────────────────────────────────────────

  const openWs = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = optsRef.current.authToken;
      const url = `${wsUrlFromApiBase(apiBase)}/api/v1/voice/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      ws.onopen  = () => resolve(ws);
      ws.onerror = () => reject(new Error("Could not connect to the voice service."));
      ws.onmessage = (ev) => { if (typeof ev.data === "string") handleWsMessage(ev.data); };
      ws.onclose = () => {
        // Only surface an error when a session is actively running (VAD started).
        // During idle pre-warm phase we silently reconnect via the ping timer.
        if (sessionActiveRef.current && stateRef.current !== "inactive") {
          setError("Voice connection dropped. Tap to restart the session.");
        }
      };
    });
  }, [handleWsMessage]);

  // ─── Ping timer — keeps pre-warmed WS alive, silently reconnects if dropped

  const startPingTimer = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    pingTimerRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      } else if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        // Silently reconnect
        openWs().then((fresh) => { wsRef.current = fresh; }).catch(() => { /* retry next tick */ });
      }
    }, PING_MS);
  }, [openWs]);

  // ─── Eager pre-warm: runs on mount so first tap has zero connection lag ──

  const prewarm = useCallback(async () => {
    if (typeof window === "undefined" || !optsRef.current.authToken) return;
    // Guard against React Strict Mode double-invoke
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    // 1 — Background-fetch VAD assets into browser cache
    void Promise.allSettled(VAD_PREFETCH_ASSETS.map((u) => fetch(u, { cache: "force-cache" })));

    // 2 — Parse + execute the vad-web JS bundle once (warms module cache)
    try { await import("@ricky0123/vad-web"); } catch { /* will retry in startSession */ }

    // 3 — Open WebSocket and start keepalive
    try {
      wsRef.current = await openWs();
      setIsReady(true);
      startPingTimer();
    } catch {
      // Non-fatal: startSession will connect when the user taps
    }
  }, [openWs, startPingTimer]);

  useEffect(() => {
    if (!opts.authToken) return;
    void prewarm();
    return () => {
      if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.authToken]);

  // Full cleanup on component unmount (navigate away)
  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
      if (vadRef.current) { try { vadRef.current.destroy(); } catch { /* */ } vadRef.current = null; }
      if (playerRef.current) { void playerRef.current.close(); playerRef.current = null; }
      if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } wsRef.current = null; }
    };
  }, []);

  // ─── Send captured utterance ─────────────────────────────────────────────

  const sendUtterance = useCallback((audio: Float32Array) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Voice connection lost. Tap to restart.");
      go("listening");
      return;
    }
    setLatency(null);

    const wav = encodeWavFromFloat32(audio, 16000);
    wav.arrayBuffer().then((buf) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        type: "config",
        subject: optsRef.current.subject,
        session_id: optsRef.current.sessionId,
        mime: "audio/wav",
        history: historyRef.current.map((m) => ({ role: m.role, content: m.content })),
      }));
      ws.send(buf);
      ws.send(JSON.stringify({ type: "audio_end" }));
    });

    go("processing");
  }, [go]);

  // ─── Session control ─────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    setError(null);
    setPartial("");
    setLiveCaption("");
    turnTextRef.current = "";
    go("loading");

    // 1 — Audio playback (must be created inside a user gesture to avoid suspension)
    const player = new StreamingAudioPlayer();
    player.onEnded = () => { if (stateRef.current === "speaking") go("listening"); };
    try {
      await player.init();
    } catch {
      setError("Could not start audio playback.");
      go("inactive");
      return;
    }
    playerRef.current = player;

    // 2 — Reuse pre-warmed WebSocket if still open, otherwise connect now
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      try {
        wsRef.current = await openWs();
        setIsReady(true);
        startPingTimer();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Voice connection failed.");
        await player.close();
        playerRef.current = null;
        go("inactive");
        return;
      }
    }

    // 3 — Silero VAD (dynamic import keeps onnxruntime-web off SSR bundle)
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      const options: Partial<RealTimeVADOptions> = {
        ...VAD_OPTS,
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        getStream: () =>
          navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          }),
        onFrameProcessed: (probs: { isSpeech: number }) => {
          const now = performance.now();
          if (now - lastLevelRef.current > 50) { lastLevelRef.current = now; setLevel(probs.isSpeech); }
        },
        onSpeechRealStart: () => {
          const s = stateRef.current;
          if (s === "speaking" || s === "processing") {
            playerRef.current?.stop();
            sendCancel();
            turnTextRef.current = "";
            setLiveCaption("");
          }
          go("recording");
        },
        onSpeechEnd: (audio: Float32Array) => {
          if (stateRef.current === "recording") sendUtterance(audio);
        },
        onVADMisfire: () => {
          if (stateRef.current === "recording") go("listening");
        },
      };

      const vad = await MicVAD.new(options);
      vadRef.current = vad;
      vad.start();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error("Unknown");
      setError(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Enable it in your browser and try again."
          : `Could not start the microphone: ${err.message}`,
      );
      await player.close();
      playerRef.current = null;
      // Leave WS alive — still pre-warmed for the user's next attempt
      go("inactive");
      return;
    }

    sessionActiveRef.current = true;
    go("listening");
  }, [go, openWs, startPingTimer, sendCancel, sendUtterance]);

  const stopSession = useCallback(() => {
    sessionActiveRef.current = false;

    if (vadRef.current) { try { vadRef.current.destroy(); } catch { /* */ } vadRef.current = null; }
    if (playerRef.current) { void playerRef.current.close(); playerRef.current = null; }
    // Intentionally leave wsRef open — stays pre-warmed for the next startSession()

    turnTextRef.current = "";
    setLiveCaption("");
    setPartial("");
    setLevel(0);
    go("inactive");
  }, [go]);

  const resetHistory = useCallback(() => { historyRef.current = []; }, []);

  return {
    state, isReady, error, audioLevel, partialTranscript, liveCaption, latency,
    startSession, stopSession, resetHistory,
  };
}
