"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

type RecognitionEvent = Event & { results: { length: number; [index: number]: RecognitionResult } };
type RecognitionErrorEvent = Event & { error: string };

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type DictationState = "idle" | "listening" | "unsupported" | "error";

type UseVoiceDictationOptions = {
  onTranscript: (text: string) => void;
  language?: string;
};

export const useVoiceDictation = ({ onTranscript, language = "en-US" }: UseVoiceDictationOptions) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptHandlerRef = useRef(onTranscript);
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    transcriptHandlerRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const start = useCallback((): void => {
    if (typeof window === "undefined") return;
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setState("unsupported");
      setError("Voice dictation is not available in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_, index) => event.results[index]?.[0]?.transcript ?? "").join(" ").trim();
      if (text.length > 0) transcriptHandlerRef.current(text);
    };
    recognition.onerror = (event) => {
      setState("error");
      setError(event.error || "Voice dictation stopped unexpectedly.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setState("idle");
    };
    recognitionRef.current = recognition;
    setError("");
    setState("listening");
    recognition.start();
  }, [language]);

  const stop = useCallback((): void => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState("idle");
  }, []);

  return {
    state,
    error,
    isSupported: state !== "unsupported",
    start,
    stop,
  };
};
