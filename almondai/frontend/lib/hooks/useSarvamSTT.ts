"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { transcribeAudio } from "@/lib/api/voice.api";

interface UseSarvamSTTReturn {
  isListening: boolean;
  isTranscribing: boolean;
  audioLevel: number; // 0–1 amplitude for waveform UI
  startListening: () => Promise<void>;
  /** Stops recording, uploads to Sarvam via backend, resolves with transcript. */
  stopListening: () => Promise<string>;
  cancel: () => void;
  error: string | null;
  isSupported: boolean;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // Prefer opus for quality+size; mp4 as Safari fallback
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useSarvamSTT(authToken: string): UseSarvamSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");

  // Web Audio API for live amplitude
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.MediaRecorder && navigator?.mediaDevices?.getUserMedia);
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    try { audioContextRef.current?.close(); } catch { /* ignore */ }
    audioContextRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setAudioLevel(Math.min(avg / 128, 1)); // normalise to 0–1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // AudioContext unavailable — waveform stays static
    }
  }, []);

  const releaseStream = useCallback(() => {
    stopAudioAnalysis();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopAudioAnalysis]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // 250ms timeslice: data arrives incrementally so we never lose a partial
      // recording if the user's tab is backgrounded or the stop event is delayed
      recorder.start(250);
      startAudioAnalysis(stream);
      setIsListening(true);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Microphone permission denied. Please allow microphone access and try again.");
      } else if (e.name === "NotFoundError") {
        setError("No microphone found. Please connect one and try again.");
      } else {
        setError(e.message || "Could not access microphone.");
      }
      releaseStream();
      setIsListening(false);
    }
  }, [isSupported, releaseStream, startAudioAnalysis]);

  const stopListening = useCallback((): Promise<string> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      releaseStream();
      setIsListening(false);
      return Promise.resolve("");
    }

    return new Promise<string>((resolve) => {
      recorder.onstop = async () => {
        releaseStream();
        setIsListening(false);
        mediaRecorderRef.current = null;

        const mimeType = mimeTypeRef.current || recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          // Blob under ~1KB means practically no audio was captured
          resolve("");
          return;
        }

        if (!authToken) {
          resolve("");
          return;
        }

        try {
          setIsTranscribing(true);
          const transcript = await transcribeAudio(authToken, blob);
          resolve(transcript.trim());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Transcription failed. Please try again.";
          setError(msg);
          resolve("");
        } finally {
          setIsTranscribing(false);
        }
      };

      try {
        recorder.stop();
      } catch {
        releaseStream();
        setIsListening(false);
        resolve("");
      }
    });
  }, [authToken, releaseStream]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // prevent transcription on cancel
      try { recorder.stop(); } catch { /* ignore */ }
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    releaseStream();
    setIsListening(false);
    setIsTranscribing(false);
  }, [releaseStream]);

  useEffect(() => () => { cancel(); }, [cancel]);

  return {
    isListening,
    isTranscribing,
    audioLevel,
    startListening,
    stopListening,
    cancel,
    error,
    isSupported,
  };
}
