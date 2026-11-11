"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi, type AiSource } from "@/components/ai/use-ai";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shown once an application reaches Offered. A market range from other listings on this site (never presented as the
 * whole market), and an editable draft reply. Nothing is sent from here: copy it into your own email.
 */
export function NegotiationPanel({ applicationId, rangeText, sample }: { applicationId: string; rangeText: string | null; sample: number }) {
  const { toast } = useToast();
  const [offer, setOffer] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [source, setSource] = useState<AiSource>("fallback");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function draft() {
    setState("loading");
    setError("");
    try {
      const r = await postAi<{ subject: string; body: string }>("negotiate", { applicationId, offer: offer.trim() });
      setSubject(r.data.subject);
      setBody(r.data.body);
      setSource(r.source);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      setState("error");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      toast({ title: "Copied to clipboard", description: "Paste it into your email app." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it manually.", tone: "error" });
    }
  }

  return (
    <div className="grid gap-4" data-testid="negotiation">
      <div>
        <p className="text-sm font-medium">What similar roles list</p>
        {rangeText ? (
          <>
            <p className="mt-1 text-sm" data-testid="market-range">
              {rangeText}
            </p>
            <p className="mt-1 text-xs text-muted">From {sample} comparable listings on this site (same level and job type). A hint about this site, not the whole market.</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Not enough comparable listings on this site to show a range.</p>
        )}
      </div>

      {state !== "ready" ? (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="offer" className="text-sm font-medium">
              Their offer <span className="font-normal text-muted">(optional)</span>
            </label>
            <Input id="offer" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={40} placeholder="For example, 21 LPA" />
          </div>
          <Button type="button" variant="secondary" onClick={draft} disabled={state === "loading"}>
            {state === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {state === "loading" ? "Drafting" : "Draft a reply"}
          </Button>
          {state === "error" && (
            <p role="alert" className="text-sm text-danger-fg">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="neg-subject" className="text-sm font-medium">
              Subject
            </label>
            <Input id="neg-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={110} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="neg-body" className="text-sm font-medium">
              Reply
            </label>
            <Textarea id="neg-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={1400} className="text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setState("idle")}>
              Start over
            </Button>
            {isAi(source) ? <AiTag label="Drafted by AI. Edit freely." /> : <span className="text-xs text-muted">Template draft (AI is unavailable right now). Edit freely.</span>}
          </div>
          <p className="text-xs text-muted">Check every figure before you send. Nothing is sent from here.</p>
        </div>
      )}
    </div>
  );
}
