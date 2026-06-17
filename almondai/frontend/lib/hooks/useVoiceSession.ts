"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";

import type { VoiceMessage } from "@/lib/api/voice.api";
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
  llm_to_audio_ms:           number | null;   // STT done → first audio (LLM ramp + Cartesia)
  llm_first_sentence_ms:     number | null;   // STT done → first sentence text event
  time_to_first_audio_ms:    number | null;   // end-to-end = stt_ms + llm_to_audio_ms
  total_ms:                  number;
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
  // Lower thresholds = more sensitive to quiet/normal-volume speech.
  // (Silero defaults are 0.5/0.35; these sit below that so soft speakers
  // are picked up without having to talk loud. noiseSuppression guards
  // against false triggers.)
  positiveSpeechThreshold: 0.35,
  negativeSpeechThreshold: 0.25,
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

  // Tracks whether VAD has confirmed speech is active (gates frame streaming)
  const isSpeakingRef = useRef(false);
  // Rolling buffer of the last ~640ms of frames captured before speech is confirmed.
  // Flushed to the backend when onSpeechRealStart fires so the first words aren't lost.
  const preSpeechBufRef = useRef<ArrayBuffer[]>([]);
  const PRE_SPEECH_MAX_FRAMES = 20; // 20 × ~32 ms = ~640 ms

  // Convert Float32 PCM [-1,1] → Int16 raw bytes for Sarvam streaming STT
  const float32ToInt16Buffer = (float32: Float32Array): ArrayBuffer => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return int16.buffer;
  };

  const sendAudioEnd = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Voice connection lost. Tap to restart.");
      go("listening");
      return;
    }
    isSpeakingRef.current = false;
    setLatency(null);
    ws.send(JSON.stringify({ type: "audio_end" }));
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
        onFrameProcessed: (probs: { isSpeech: number; notSpeech: number }, frame?: Float32Array) => {
          const now = performance.now();
          if (now - lastLevelRef.current > 50) { lastLevelRef.current = now; setLevel(probs.isSpeech); }
          if (!frame) return;
          const pcm = float32ToInt16Buffer(frame);
          if (isSpeakingRef.current) {
            // Send every frame of the utterance (incl. natural micro-pauses) so
            // Sarvam gets clean continuous audio. Silero defines the utterance
            // boundaries; flush() at the end is our sole STT-finalize signal.
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(pcm);
          } else {
            // Keep a rolling window of pre-speech frames so first words aren't lost
            preSpeechBufRef.current.push(pcm);
            if (preSpeechBufRef.current.length > PRE_SPEECH_MAX_FRAMES) {
              preSpeechBufRef.current.shift();
            }
          }
        },
        onSpeechRealStart: () => {
          const s = stateRef.current;
          if (s === "speaking" || s === "processing") {
            playerRef.current?.stop();
            sendCancel();
            turnTextRef.current = "";
            setLiveCaption("");
          }
          setLatency(null);
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            // Send config so the backend opens the Sarvam streaming session
            ws.send(JSON.stringify({
              type: "config",
              subject: optsRef.current.subject,
              session_id: optsRef.current.sessionId,
              mime: "audio/pcm",
              sample_rate: 16000,
              history: historyRef.current.map((m) => ({ role: m.role, content: m.content })),
            }));
            // Flush pre-speech buffer so the first words (captured before VAD confirmed
            // speech) are included — prevents the first syllable from being clipped
            for (const buf of preSpeechBufRef.current) ws.send(buf);
          }
          preSpeechBufRef.current = [];
          isSpeakingRef.current = true;
          go("recording");
        },
        onSpeechEnd: () => {
          if (stateRef.current === "recording") sendAudioEnd();
        },
        onVADMisfire: () => {
          if (stateRef.current === "recording") {
            // Close any open Sarvam STT session before going back to listening
            isSpeakingRef.current = false;
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "audio_end" }));
            }
            go("listening");
          }
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
  }, [go, openWs, startPingTimer, sendCancel, sendAudioEnd]);

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
