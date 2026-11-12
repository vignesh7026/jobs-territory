"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { submitReport } from "@/app/(app)/reports/actions";
import { REASONS, type Reason } from "@/lib/reports";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";

const select = "h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10";

/** A small "Report" link that opens a short form. Signed-out visitors do not see it: reports are tied to an account. */
export function ReportButton({ kind, targetId, label = "Report", signedIn }: { kind: "job" | "company" | "insight"; targetId: string; label?: string; signedIn: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState<Reason>("fake_company");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  if (!signedIn) return null;
  if (done) return <span className="text-xs text-muted">Reported. Thank you.</span>;

  function send(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await submitReport({ kind, targetId, reason, detail });
      toast({ title: r.message, tone: r.ok ? "success" : "error" });
      if (r.ok || r.message.startsWith("You have already")) setDone(true);
    });
  }

  return (
    <div className="inline-block text-left">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-1 text-xs text-muted underline-offset-4 hover:text-text hover:underline">
        <Flag className="size-3.5" aria-hidden="true" /> {label}
      </button>
      {open && (
        <form onSubmit={send} className="mt-2 grid max-w-sm gap-2 rounded-md border border-border bg-surface p-3" data-testid="report-form">
          <label htmlFor={`rr-${targetId}`} className="text-sm font-medium">What is wrong?</label>
          <select id={`rr-${targetId}`} className={select} value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
            {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label htmlFor={`rd-${targetId}`} className="text-sm font-medium">Details (optional)</label>
          <textarea id={`rd-${targetId}`} className="min-h-20 rounded-md border border-border bg-surface p-2 text-sm" maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>Send report</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
