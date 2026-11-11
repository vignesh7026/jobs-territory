"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { STATUS_ICON } from "@/components/applications/status-badge";
import { PIPELINE, STATUS_LABELS, type ApplicationStatus } from "@/lib/applications/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  status: ApplicationStatus;
  /** when each status was first reached */
  events: { status: ApplicationStatus; createdAt: string }[];
}

const STATUS_COLOR: Record<ApplicationStatus, { fill: string; ring: string }> = {
  applied: { fill: "bg-status-applied", ring: "border-status-applied" },
  under_review: { fill: "bg-status-review", ring: "border-status-review" },
  shortlisted: { fill: "bg-status-shortlisted", ring: "border-status-shortlisted" },
  interview: { fill: "bg-status-interview", ring: "border-status-interview" },
  offered: { fill: "bg-status-offered", ring: "border-status-offered" },
  rejected: { fill: "bg-status-rejected", ring: "border-status-rejected" },
};

/**
 * Progress through the hiring process. Vertical on phones, horizontal from md up.
 * The connecting lines fill one after another when the page opens; the current step pulses (the only looping motion).
 * Rejected applications show the stages they reached, then a terminal Rejected step.
 */
export function StatusTimeline({ status, events }: Props) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const when = (s: ApplicationStatus) => events.find((e) => e.status === s)?.createdAt;
  const rejected = status === "rejected";
  const reachedIdx = Math.max(0, ...events.map((e) => PIPELINE.indexOf(e.status as (typeof PIPELINE)[number])));
  const currentIdx = rejected ? -1 : PIPELINE.indexOf(status as (typeof PIPELINE)[number]);

  const steps: { key: ApplicationStatus; state: "done" | "current" | "todo"; date?: string }[] = PIPELINE.slice(0, rejected ? reachedIdx + 1 : PIPELINE.length).map((s, i) => ({
    key: s,
    state: rejected ? "done" : i < currentIdx ? "done" : i === currentIdx ? "current" : "todo",
    date: when(s),
  }));
  if (rejected) steps.push({ key: "rejected", state: "current", date: when("rejected") });

  return (
    <ol aria-label="Application progress" className="flex flex-col md:flex-row">
      {steps.map((step, i) => {
        const Icon = STATUS_ICON[step.key];
        const last = i === steps.length - 1;
        const filledLine = step.state === "done"; // the line after a completed step is filled
        return (
          <li key={step.key} className={cn("relative flex gap-3 pb-6 md:flex-1 md:flex-col md:gap-2 md:pb-0", last && "md:flex-none md:pr-0")}>
            {!last && (
              <span aria-hidden="true" className="absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px bg-border md:left-8 md:top-3 md:h-px md:w-[calc(100%-2rem)]">
                <span
                  className={cn(
                    "absolute inset-0 origin-top bg-primary transition-transform duration-slow ease-out md:origin-left",
                    filledLine && drawn ? "scale-100" : "scale-y-0 md:scale-x-0 md:scale-y-100",
                  )}
                  style={{ transitionDelay: `${i * 140}ms` }}
                />
              </span>
            )}

            <span className="relative z-10 grid size-6 shrink-0 place-items-center">
              {step.state === "current" && <span aria-hidden="true" className={cn("absolute -inset-1 animate-pulse rounded-full border-2", STATUS_COLOR[step.key].ring)} />}
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border transition-colors duration-slow",
                  step.state === "done" && "border-primary bg-primary text-primary-fg",
                  step.state === "current" && cn("border-transparent text-white", STATUS_COLOR[step.key].fill),
                  step.state === "todo" && "border-border bg-surface text-muted",
                )}
                style={{ transitionDelay: `${i * 140}ms` }}
              >
                {step.state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden />}
              </span>
            </span>

            <div className="min-w-0 pb-0.5 md:pr-3">
              <p className={cn("text-sm font-medium", step.state === "todo" && "text-muted")}>
                {STATUS_LABELS[step.key]}
                <span className="sr-only">{step.state === "done" ? " (completed)" : step.state === "current" ? " (current step)" : " (not reached yet)"}</span>
              </p>
              <p className="text-xs text-muted tabular-nums">{step.date ? formatDate(step.date) : step.state === "todo" ? "Not yet" : ""}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
