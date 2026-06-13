"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";

import type { VoiceMessage } from "@/lib/api/voice.api";
import { encodeWavFromFloat32 } from "@/lib/audio/encodeWav";
import { StreamingAudioPlayer } from "@/lib/audio/StreamingAudioPlayer";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SessionState =
  | "inactive"    // session off
  | "loading"     // loading VAD model / connecting
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

export interface UseVoiceSessionReturn {
  state:             SessionState;
  error:             string | null;
  audioLevel:        number;        // 0–1 Silero speech probability
  partialTranscript: string;        // last thing the user said (heard)
  liveCaption:       string;        // assistant sentences streaming in this turn
  startSession:      () => Promise<void>;
  stopSession:       () => void;
  resetHistory:      () => void;
}

// ─── VAD tuning (calibrated for noisy hostel / hospital / classroom) ──────────
// Higher positive threshold = fewer false triggers from fans, keyboards, chatter.
const VAD_OPTS = {
  model: "v5" as const,
  positiveSpeechThreshold: 0.6,  // must be fairly confident it's speech
  negativeSpeechThreshold: 0.4,  // hysteresis gap prevents flicker
  redemptionMs: 800,             // silence held this long = end of turn
  minSpeechMs: 250,              // ignore sub-250ms blips (clicks, coughs)
  preSpeechPadMs: 200,           // prepend so the first word isn't clipped
};

function wsUrlFromApiBase(apiBase: string): string {
  // http://host:8000 -> ws://host:8000 ; https -> wss
  return apiBase.replace(/^http/, "ws");
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceSession(opts: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [state, setState]             = useState<SessionState>("inactive");
  const [error, setError]             = useState<string | null>(null);
  const [audioLevel, setLevel]        = useState(0);
  const [partialTranscript, setPartial] = useState("");
  const [liveCaption, setLiveCaption] = useState("");

  // opts ref — always current, no re-render churn
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  // state ref — read inside async VAD/WS callbacks without stale closures
  const stateRef = useRef<SessionState>("inactive");
  const go = useCallback((s: SessionState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const vadRef     = useRef<MicVAD | null>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const playerRef  = useRef<StreamingAudioPlayer | null>(null);
  const historyRef = useRef<VoiceMessage[]>([]);
  const turnTextRef = useRef("");           // accumulating assistant text this turn
  const lastLevelRef = useRef(0);           // throttle level updates
  const manualStopRef = useRef(false);      // distinguishes user stop from dropped ws

  // ─── WebSocket plumbing ──────────────────────────────────────────────────

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

    if (type === "transcript") {
      const text = String(msg.text ?? "").trim();
      setPartial(text);
      if (text) {
        const userMsg: VoiceMessage = {
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        };
        historyRef.current = [...historyRef.current, userMsg];
        optsRef.current.onMessage(userMsg);
      } else if (stateRef.current === "processing") {
        // Nothing recognized — drop back to listening
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
        const aiMsg: VoiceMessage = {
          role: "assistant",
          content: full,
          timestamp: new Date().toISOString(),
        };
        historyRef.current = [...historyRef.current, aiMsg];
        optsRef.current.onMessage(aiMsg);
      }
      turnTextRef.current = "";
      setLiveCaption("");
      // If no audio is playing (e.g. empty/failed TTS) return to listening now.
      const player = playerRef.current;
      if (stateRef.current !== "recording" && !(player && player.isPlaying)) {
        go("listening");
      }

    } else if (type === "error") {
      setError(String(msg.message ?? "Voice service error."));
      if (stateRef.current !== "recording") go("listening");
    }
  }, [go]);

  const connectWs = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = optsRef.current.authToken;
      const url = `${wsUrlFromApiBase(apiBase)}/api/v1/voice/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error("Could not connect to the voice service."));
      ws.onmessage = (ev) => { if (typeof ev.data === "string") handleWsMessage(ev.data); };
      ws.onclose = () => {
        if (manualStopRef.current) return;
        // Unexpected drop while session active — surface softly
        if (stateRef.current !== "inactive") {
          setError("Voice connection dropped. Tap to restart the session.");
        }
      };
    });
  }, [handleWsMessage]);

  // ─── send a captured utterance ───────────────────────────────────────────

  const sendUtterance = useCallback((audio: Float32Array) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Voice connection lost. Tap to restart.");
      go("listening");
      return;
    }

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

  // ─── session control ─────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    setError(null);
    setPartial("");
    setLiveCaption("");
    turnTextRef.current = "";
    manualStopRef.current = false;
    go("loading");

    // 1 — audio playback (created under the click gesture so it isn't suspended)
    const player = new StreamingAudioPlayer();
    player.onEnded = () => {
      // TTS finished and nothing else queued — resume listening
      if (stateRef.current === "speaking") go("listening");
    };
    try {
      await player.init();
    } catch {
      setError("Could not start audio playback.");
      go("inactive");
      return;
    }
    playerRef.current = player;

    // 2 — WebSocket
    try {
      wsRef.current = await connectWs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Voice connection failed.");
      await player.close();
      playerRef.current = null;
      go("inactive");
      return;
    }

    // 3 — Silero VAD (dynamic import: keeps onnxruntime-web off the server bundle)
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      const options: Partial<RealTimeVADOptions> = {
        ...VAD_OPTS,
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        getStream: () =>
          navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,   // cancel TTS so barge-in works on speakers
              noiseSuppression: true,
              autoGainControl: true,
            },
          }),
        onFrameProcessed: (probs: { isSpeech: number }) => {
          const now = performance.now();
          if (now - lastLevelRef.current > 50) {
            lastLevelRef.current = now;
            setLevel(probs.isSpeech);
          }
        },
        onSpeechRealStart: () => {
          // Confirmed sustained speech (filters out brief TTS echo blips).
          const s = stateRef.current;
          if (s === "speaking" || s === "processing") {
            // BARGE-IN: cut current response and capture the new one
            playerRef.current?.stop();
            sendCancel();
            turnTextRef.current = "";
            setLiveCaption("");
          }
          go("recording");
        },
        onSpeechEnd: (audio: Float32Array) => {
          // Only honor segments that began as confirmed speech (state === recording).
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
      // tear down ws + player
      manualStopRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      await player.close();
      playerRef.current = null;
      go("inactive");
      return;
    }

    go("listening");
  }, [go, connectWs, sendCancel, sendUtterance]);

  const stopSession = useCallback(() => {
    manualStopRef.current = true;

    if (vadRef.current) {
      try { vadRef.current.destroy(); } catch { /* ignore */ }
      vadRef.current = null;
    }
    if (playerRef.current) {
      void playerRef.current.close();
      playerRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }

    turnTextRef.current = "";
    setLiveCaption("");
    setPartial("");
    setLevel(0);
    go("inactive");
  }, [go]);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  useEffect(() => () => { stopSession(); }, [stopSession]);

  return {
    state, error, audioLevel, partialTranscript, liveCaption,
    startSession, stopSession, resetHistory,
  };
}
