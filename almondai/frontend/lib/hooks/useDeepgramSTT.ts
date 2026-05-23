"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseDeepgramSTTReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  isSupported: boolean;
}

export function useDeepgramSTT(apiToken: string): UseDeepgramSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(window.WebSocket && window.MediaRecorder && navigator?.mediaDevices?.getUserMedia);
  }, []);

  const cleanup = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // Ignore recorder state errors during cleanup.
    }

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    } catch {
      // Ignore socket errors during cleanup.
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    mediaRecorderRef.current = null;
    socketRef.current = null;
    streamRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (!apiToken) {
      setError("Voice token unavailable. Please refresh and try again.");
      return;
    }

    try {
      setError(null);
      setTranscript("");
      setInterimTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const socket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?language=en-US&model=nova-2&smart_format=true&interim_results=true&endpointing=500&utterance_end_ms=1500",
        ["token", apiToken],
      );
      socketRef.current = socket;

      socket.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250);
        setIsListening(true);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data) as {
          type?: string;
          is_final?: boolean;
          channel?: {
            alternatives?: Array<{ transcript?: string }>;
          };
        };

        if (data.type === "Results" && data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const text = (alt.transcript || "").trim();
          const isFinal = Boolean(data.is_final);

          if (text) {
            if (isFinal) {
              setTranscript((prev) => (prev ? `${prev} ${text}` : text));
              setInterimTranscript("");
            } else {
              setInterimTranscript(text);
            }
          }
        }

        if (data.type === "UtteranceEnd") {
          setInterimTranscript("");
        }
      };

      socket.onerror = () => {
        setError("Connection error. Please try again.");
        cleanup();
      };

      socket.onclose = () => {
        setIsListening(false);
        setInterimTranscript("");
      };
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        if (caughtError.name === "NotAllowedError") {
          setError("Microphone permission denied. Please allow microphone access.");
        } else {
          setError(caughtError.message);
        }
      } else {
        setError("Could not access microphone.");
      }
      cleanup();
    }
  }, [apiToken, cleanup, isSupported]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isSupported,
  };
}
