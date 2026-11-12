"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Download } from "lucide-react";
import { setInterviewTime } from "@/app/(app)/applications/interview-actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** "2026-07-03T09:30" in the viewer's own time zone, the format a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Where the candidate records when their interview is. Dates are shown and entered in their own time zone and stored
 * as exact moments; the calendar file carries the moment, so it lands at the right hour anywhere.
 */
export function InterviewPanel({ applicationId, interviewAt, canSet }: { applicationId: string; interviewAt: string | null; canSet: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(() => toLocalInput(interviewAt));
  const [error, setError] = useState("");

  if (!canSet && !interviewAt) return null;

  function save(clear: boolean) {
    setError("");
    if (!clear && !value) return setError("Pick a date and time first.");
    start(async () => {
      const r = await setInterviewTime({ applicationId, at: clear ? null : new Date(value).toISOString() });
      if (r.ok) {
        if (clear) setValue("");
        toast({ title: clear ? "Interview time cleared" : "Interview time saved", tone: "success" });
        router.refresh();
      } else setError(r.message);
    });
  }

  return (
    <Card className="p-5" data-testid="interview-panel">
      <h2 className="inline-flex items-center gap-2 text-base">
        <CalendarDays className="size-4" aria-hidden="true" /> Interview
      </h2>
      {interviewAt && (
        <p className="mt-2 text-sm font-medium" data-testid="interview-when">
          {new Date(interviewAt).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
      <div className="mt-3 grid gap-1.5">
        <label htmlFor="interview-at" className="text-sm font-medium">{interviewAt ? "Change the time" : "When is it?"}</label>
        <Input id="interview-at" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => save(false)}>Save time</Button>
        {interviewAt && (
          <>
            <a href={`/api/applications/${applicationId}/ics`} className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-primary-soft md:h-10">
              <Download className="size-4" aria-hidden="true" /> Add to calendar
            </a>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => save(true)}>Clear</Button>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Only you see this. The calendar file adds a reminder a day and an hour before.</p>
    </Card>
  );
}
