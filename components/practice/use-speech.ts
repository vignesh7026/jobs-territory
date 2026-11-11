"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The browser's own speech recognition (Chrome, Edge, Safari). Audio stays in the browser; only text comes out.
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type Ctor = new () => Recognition;
const ctor = (): Ctor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Dictation into a text value. `base` is what is already typed; recognised words are appended to it. */
export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSupported(ctor() !== null), 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => () => rec.current?.stop(), []);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(
    (base: string) => {
      const C = ctor();
      if (!C) return;
      setError("");
      let finalText = base ? base.trim() + " " : "";
      const r = new C();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-IN";
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const piece = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += piece + " ";
          else interim += piece;
        }
        onText((finalText + interim).trim());
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Microphone access is blocked. Allow it in the address bar, or type instead.");
        else if (e.error !== "no-speech" && e.error !== "aborted") setError("Speech recognition stopped. You can type instead.");
        setListening(false);
      };
      r.onend = () => setListening(false);
      rec.current = r;
      setListening(true);
      r.start();
    },
    [onText],
  );

  return { supported, listening, error, start, stop };
}
