"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Sparkles, Square } from "lucide-react";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi } from "@/components/ai/use-ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { VoiceDraft } from "@/lib/voice-profile";
import { cn } from "@/lib/utils";

// The browser's own speech recognition (Chrome, Edge, Safari). No audio ever reaches our server; only the text does.
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
type RecognitionCtor = new () => Recognition;
const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const MAX_SECONDS = 90;
type Phase = "idle" | "listening" | "drafting" | "review";

export function VoiceBuilder({ onApply }: { onApply: (pick: { headline?: string; summary?: string; skills: string[] }) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [aiMade, setAiMade] = useState(false);
  const [useHeadline, setUseHeadline] = useState(true);
  const [useSummary, setUseSummary] = useState(true);
  const [skillPick, setSkillPick] = useState<Set<string>>(new Set());
  // Whether this browser can listen is only known on the client, so it is read after mount.
  const [canListen, setCanListen] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const timer = useRef<number | null>(null);
  const finalText = useRef("");

  useEffect(() => {
    const id = window.setTimeout(() => setCanListen(recognitionCtor() !== null), 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(
    () => () => {
      rec.current?.stop();
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  function stopListening() {
    rec.current?.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPhase("idle");
  }

  function startListening() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError("");
    finalText.current = text ? text.trim() + " " : "";
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText.current += piece + " ";
        else interim += piece;
      }
      setText((finalText.current + interim).trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Microphone access is blocked. Allow it in the address bar, or type instead.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Speech recognition stopped. You can type instead.");
      stopListening();
    };
    r.onend = () => setPhase((p) => (p === "listening" ? "idle" : p));
    rec.current = r;
    setSeconds(0);
    setPhase("listening");
    r.start();
    timer.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stopListening();
        return s + 1;
      });
    }, 1000);
  }

  async function makeDraft() {
    setPhase("drafting");
    setError("");
    try {
      const r = await postAi<VoiceDraft>("voice-profile", { transcript: text });
      setDraft(r.data);
      setAiMade(isAi(r.source));
      setUseHeadline(Boolean(r.data.headline));
      setUseSummary(true);
      setSkillPick(new Set(r.data.skills));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      setPhase("idle");
    }
  }

  function apply() {
    if (!draft) return;
    onApply({
      headline: useHeadline && draft.headline ? draft.headline : undefined,
      summary: useSummary ? draft.summary : undefined,
      skills: draft.skills.filter((s) => skillPick.has(s)),
    });
    setDraft(null);
    setText("");
    setPhase("idle");
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Card className="p-5" data-testid="voice-builder">
      <h2 className="inline-flex items-center gap-2 text-base">
        <Mic className="size-4" aria-hidden="true" /> Speak your profile
      </h2>

      {phase !== "review" && (
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-muted">Talk for a minute about what you do and what you have worked with, or type it. We draft your headline, summary and skills; you choose what goes in.</p>
          <label htmlFor="voice-text" className="sr-only">
            What you would say about yourself
          </label>
          <Textarea id="voice-text" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} placeholder="I am a backend developer with three years in fintech. I mostly write Node.js and PostgreSQL…" readOnly={phase === "listening"} className="text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            {canListen &&
              (phase === "listening" ? (
                <Button type="button" variant="secondary" onClick={stopListening}>
                  <Square className="size-4 fill-current" aria-hidden="true" /> Stop <span className="tabular-nums text-muted">{clock}</span>
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={startListening} disabled={phase === "drafting"}>
                  <Mic className="size-4" aria-hidden="true" /> Speak
                </Button>
              ))}
            <Button type="button" variant="secondary" onClick={makeDraft} disabled={phase === "drafting" || phase === "listening" || text.trim().length < 40}>
              {phase === "drafting" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {phase === "drafting" ? "Drafting" : "Draft my profile"}
            </Button>
          </div>
          {phase === "listening" && (
            <p role="status" className="text-xs text-muted">
              Listening, up to {MAX_SECONDS} seconds. Your browser does the speech-to-text; we receive only the words.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger-fg">
              {error}
            </p>
          )}
          {!canListen && <p className="text-xs text-muted">This browser cannot listen, so type it instead.</p>}
        </div>
      )}

      {phase === "review" && draft && (
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-muted">Pick what to use. Nothing changes until you press Save changes on the profile.</p>
          {draft.headline && (
            <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input type="checkbox" checked={useHeadline} onChange={(e) => setUseHeadline(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                <span className="block text-xs font-medium uppercase tracking-wide text-muted">Headline</span>
                {draft.headline}
              </span>
            </label>
          )}
          <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
            <input type="checkbox" checked={useSummary} onChange={(e) => setUseSummary(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="block text-xs font-medium uppercase tracking-wide text-muted">Summary</span>
              {draft.summary}
            </span>
          </label>
          {draft.skills.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Skills you named</legend>
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map((s) => {
                  const on = skillPick.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSkillPick((cur) => {
                          const next = new Set(cur);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          return next;
                        })
                      }
                      className={cn("inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-sm transition-colors duration-fast", on ? "border-primary bg-primary-soft" : "border-border text-muted")}
                    >
                      {on && <Check className="size-3.5" aria-hidden="true" />} {s}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={apply} disabled={!useHeadline && !useSummary && skillPick.size === 0}>
              Use in my profile
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPhase("idle")}>
              Back
            </Button>
          </div>
          {aiMade ? <AiTag label="Drafted by AI from your words. Edit freely." /> : <span className="text-xs text-muted">Plain draft from your words (AI is unavailable right now).</span>}
        </div>
      )}
    </Card>
  );
}
