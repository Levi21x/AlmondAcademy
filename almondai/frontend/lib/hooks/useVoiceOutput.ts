"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VOICE_RATE_KEY = "almond.voice.rate";
const VOICE_NAME_KEY = "almond.voice.name";

export interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;
  setRate: (rate: number) => void;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRateState] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = useMemo(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }, []);

  const loadVoices = useCallback(() => {
    if (!isSupported) {
      return;
    }

    const allVoices = window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter((voice) => voice.lang.toLowerCase().includes("en"));
    const nextVoices = englishVoices.length > 0 ? englishVoices : allVoices;
    setVoices(nextVoices);

    const storedName = window.localStorage.getItem(VOICE_NAME_KEY);
    const stored = nextVoices.find((voice) => voice.name === storedName) ?? null;
    const fallback = nextVoices.find((voice) => voice.lang.toLowerCase().includes("en")) ?? nextVoices[0] ?? null;
    setSelectedVoiceState(stored ?? fallback);
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const savedRate = Number(window.localStorage.getItem(VOICE_RATE_KEY));
    if (!Number.isNaN(savedRate) && savedRate >= 0.5 && savedRate <= 2) {
      setRateState(savedRate);
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [isSupported, loadVoices]);

  const setSelectedVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoiceState(voice);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOICE_NAME_KEY, voice.name);
    }
  }, []);

  const setRate = useCallback((nextRate: number) => {
    const clamped = Math.max(0.5, Math.min(2, nextRate));
    setRateState(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOICE_RATE_KEY, clamped.toString());
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      try {
        if (!isSupported || !text.trim()) {
          return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;
        utterance.rate = rate;
        utterance.pitch = 1;

        utterance.onstart = () => {
          setIsPaused(false);
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          setIsPaused(false);
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsPaused(false);
          setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPaused(false);
        setIsSpeaking(false);
      }
    },
    [isSupported, rate, selectedVoice],
  );

  const pause = useCallback(() => {
    if (!isSupported) {
      return;
    }
    try {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } catch {
      setIsPaused(false);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) {
      return;
    }
    try {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } catch {
      setIsPaused(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors.
    } finally {
      utteranceRef.current = null;
      setIsPaused(false);
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    stop,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
  };
}
