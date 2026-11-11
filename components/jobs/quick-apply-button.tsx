"use client";

import { useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { useToast } from "@/components/shell/toaster";

type Phase = "idle" | "sending" | "applied";

/** One-tap apply with the current profile and no cover note. Undo stays available for ten minutes, like any application. */
export function QuickApplyButton({ jobId, jobTitle, company }: { jobId: string; jobTitle: string; company: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const { toast } = useToast();

  async function undo(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setPhase("idle");
      toast({ title: "Application withdrawn", description: "You can apply again whenever you like." });
    } else {
      const body = res ? await res.json().catch(() => null) : null;
      toast({ title: "Could not undo", description: body?.error ?? "Try again in a moment.", tone: "error" });
    }
  }

  async function apply() {
    setPhase("sending");
    const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.status === 201 && body?.id) {
      setPhase("applied");
      toast({ title: `Applied to ${jobTitle}`, description: `${company} will see your profile and resume.`, tone: "success", action: { label: "Undo", onClick: () => undo(body.id) } });
    } else if (res?.status === 401) {
      setPhase("idle");
      toast({ title: "Your session expired", description: "Sign in again to apply.", tone: "error" });
    } else if (res?.status === 409) {
      setPhase("applied");
      toast({ title: "Already applied", description: "You applied to this job earlier." });
    } else {
      setPhase("idle");
      toast({ title: "Could not apply", description: body?.error ?? "Check your connection and try again.", tone: "error" });
    }
  }

  return (
    <button
      type="button"
      onClick={apply}
      disabled={phase !== "idle"}
      aria-label={phase === "applied" ? `Applied to ${jobTitle}` : `Quick apply to ${jobTitle}`}
      className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors duration-fast hover:bg-primary-soft disabled:cursor-default disabled:opacity-80 md:h-9"
    >
      {phase === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : phase === "applied" ? <Check className="size-4 text-success-fg" aria-hidden="true" /> : <Zap className="size-4" aria-hidden="true" />}
      {phase === "applied" ? "Applied" : phase === "sending" ? "Sending" : "Quick apply"}
    </button>
  );
}
