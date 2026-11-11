"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi, type AiSource } from "@/components/ai/use-ai";
import { Button } from "@/components/ui/button";

/** Skill-gap analysis on demand: one practical line per missing skill. Hidden until asked for, so it costs nothing unless used. */
export function GapAdvice({ jobId, missingCount }: { jobId: string; missingCount: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [items, setItems] = useState<{ skill: string; advice: string }[]>([]);
  const [source, setSource] = useState<AiSource>("fallback");
  const [message, setMessage] = useState("");
  const [hidden, setHidden] = useState(false);

  if (missingCount === 0) return null;

  async function load() {
    setState("loading");
    try {
      const r = await postAi<{ items: { skill: string; advice: string }[] }>("gap", { jobId });
      setItems(r.data.items);
      setSource(r.source);
      setState("done");
      setHidden(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Try again.");
      setState("error");
    }
  }

  if (state === "idle" || state === "error") {
    return (
      <div className="mt-4 border-t border-border pt-3">
        <Button variant="secondary" size="sm" onClick={load}>
          <Sparkles aria-hidden="true" /> How to close these gaps
        </Button>
        {state === "error" && (
          <p role="alert" className="mt-2 text-sm text-danger-fg">
            {message}
          </p>
        )}
      </div>
    );
  }
  if (state === "loading") {
    return (
      <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Working it out
      </p>
    );
  }
  if (hidden) {
    return (
      <div className="mt-4 border-t border-border pt-3">
        <button type="button" onClick={() => setHidden(false)} className="text-sm text-primary underline-offset-4 hover:underline">
          Show gap advice
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 border-t border-border pt-3">
      <ul className="grid gap-3">
        {items.map((i) => (
          <li key={i.skill} className="text-sm leading-relaxed">
            <span className="font-medium">{i.skill}.</span> {i.advice}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3">
        {isAi(source) ? <AiTag /> : <span className="text-xs text-muted">General advice (AI is unavailable right now)</span>}
        <button type="button" onClick={() => setHidden(true)} className="text-xs text-primary underline-offset-4 hover:underline">
          Dismiss
        </button>
      </div>
    </div>
  );
}
