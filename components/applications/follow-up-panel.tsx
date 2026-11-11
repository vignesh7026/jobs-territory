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
 * Drafts a polite follow-up the candidate can edit and copy. Nothing is ever sent from here: there is no recipient,
 * no send button, and the draft disappears when dismissed.
 */
export function FollowUpPanel({ applicationId, urgent }: { applicationId: string; urgent: boolean }) {
  const { toast } = useToast();
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
      const r = await postAi<{ subject: string; body: string }>("follow-up", { applicationId });
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

  if (state === "ready") {
    return (
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="fu-subject" className="text-sm font-medium">
            Subject
          </label>
          <Input id="fu-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={110} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="fu-body" className="text-sm font-medium">
            Message
          </label>
          <Textarea id="fu-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1400} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isAi(source) ? <AiTag label="Drafted by AI. Edit freely." /> : <span className="text-xs text-muted">Template draft (AI is unavailable right now). Edit freely.</span>}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setState("idle")}>
              Dismiss
            </Button>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted">This is only a draft. Nothing is sent for you.</p>
      </div>
    );
  }

  return (
    <div>
      <Button variant={urgent ? "primary" : "secondary"} onClick={draft} disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {state === "loading" ? "Drafting" : "Draft a follow-up"}
      </Button>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
