"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCartesiaTTSReturn {
  isSpeaking: boolean;
  speak: (text: string, token: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useCartesiaTTS(): UseCartesiaTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const speak = useCallback(
    async (text: string, authToken: string) => {
      try {
        setError(null);
        cleanupAudio();

        setIsSpeaking(true);

        const response = await fetch(`${apiBase}/api/v1/voice/speak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error("TTS request failed");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;

        audio.onended = () => {
          setIsSpeaking(false);
          cleanupAudio();
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setError("Failed to play audio");
          cleanupAudio();
        };

        await audio.play();
      } catch (caughtError: unknown) {
        setIsSpeaking(false);
        if (caughtError instanceof Error) {
          setError(caughtError.message);
        } else {
          setError("TTS failed.");
        }
        cleanupAudio();
      }
    },
    [apiBase, cleanupAudio],
  );

  const stop = useCallback(() => {
    cleanupAudio();
    setIsSpeaking(false);
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return { isSpeaking, speak, stop, error };
}
