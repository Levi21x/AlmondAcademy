"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { transcribeAudio } from "@/lib/api/voice.api";

export interface StartListeningResult {
  success: boolean;
  error?: string;
}

export interface UseSarvamSTTReturn {
  isListening: boolean;
  isTranscribing: boolean;
  startListening: () => Promise<StartListeningResult>;
  stopListening: () => Promise<string>;
  cancel: () => void;
  error: string | null;
  isSupported: boolean;
}

export function useSarvamSTT(authToken: string): UseSarvamSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  // Keep authToken in a ref so stopListening always uses the latest value
  const authTokenRef = useRef(authToken);
  useEffect(() => { authTokenRef.current = authToken; }, [authToken]);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.MediaRecorder && navigator?.mediaDevices?.getUserMedia);
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async (): Promise<StartListeningResult> => {
    if (!isSupported) {
      const msg = "Voice input is not supported in this browser.";
      setError(msg);
      return { success: false, error: msg };
    }

    // Reset state for fresh recording
    setError(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      // Absolute minimum constraints — no sampleRate, no channelCount.
      // Extra constraints cause OverconstrainedError on many systems.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      let msg: string;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        msg = "Microphone access denied. Enable it in your browser and try again.";
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        msg = "No microphone found. Please connect one and try again.";
      } else {
        msg = `Microphone error: ${e.message}`;
      }
      setError(msg);
      return { success: false, error: msg };
    }

    streamRef.current = stream;

    // Pick the first supported MIME type; fall back to browser default
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    mimeTypeRef.current = mimeType;

    try {
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording error. Please try again.");
        setIsListening(false);
        releaseStream();
      };

      // No timeslice — data is delivered in one chunk on stop().
      // This is simpler and avoids edge cases with partial chunks.
      recorder.start();
      setIsListening(true);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start recording.";
      setError(msg);
      releaseStream();
      return { success: false, error: msg };
    }
  }, [isSupported, releaseStream]);

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

        // Build blob from accumulated chunks
        const type = mimeTypeRef.current || recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];

        if (blob.size < 100) {
          setError("Nothing recorded. Hold the mic button while speaking.");
          resolve("");
          return;
        }

        const token = authTokenRef.current;
        if (!token) {
          resolve("");
          return;
        }

        try {
          setIsTranscribing(true);
          const transcript = await transcribeAudio(token, blob);
          resolve(transcript.trim());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Transcription failed.";
          setError(msg);
          resolve("");
        } finally {
          setIsTranscribing(false);
        }
      };

      // request any buffered data before stopping
      try {
        recorder.requestData();
      } catch { /* not all browsers support this — safe to ignore */ }

      try {
        recorder.stop();
      } catch {
        releaseStream();
        setIsListening(false);
        resolve("");
      }
    });
  }, [releaseStream]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // skip transcription
      try { recorder.stop(); } catch { /* ignore */ }
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    releaseStream();
    setIsListening(false);
    setIsTranscribing(false);
  }, [releaseStream]);

  useEffect(() => () => { cancel(); }, [cancel]);

  return { isListening, isTranscribing, startListening, stopListening, cancel, error, isSupported };
}
