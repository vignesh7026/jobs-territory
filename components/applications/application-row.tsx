import Link from "next/link";
import { HealthChip } from "@/components/applications/health-meter";
import { StatusBadge } from "@/components/applications/status-badge";
import { applicationHealth } from "@/lib/applications/health";
import { CompanyMark } from "@/components/jobs/job-row";
import { PIPELINE, STATUS_LABELS } from "@/lib/applications/status";
import { timeAgo } from "@/lib/format";
import type { ApplicationSummary } from "@/lib/applications/queries";
import { cn } from "@/lib/utils";

/** Five short segments, one per stage. Filled up to the furthest stage reached; red end-cap if rejected. */
export function ProgressSegments({ reached, rejected, className }: { reached: number; rejected: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-1", className)}>
      {PIPELINE.map((s, i) => (
        <span key={s} className={cn("h-1.5 w-6 rounded-full", i <= reached ? (rejected && i === reached ? "bg-status-rejected" : "bg-primary") : "bg-border")} />
      ))}
    </div>
  );
}

export function ApplicationRow({ application: a, href }: { application: ApplicationSummary; href?: string }) {
  const stage = a.status === "rejected" ? `Rejected after ${STATUS_LABELS[PIPELINE[a.reached]].toLowerCase()}` : STATUS_LABELS[a.status];
  return (
    <li>
      <Link
        href={href ?? `/applications/${a.id}`}
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-lg border border-border bg-surface p-4 transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:shadow-soft sm:grid-cols-[auto_1fr_auto]"
      >
        <CompanyMark name={a.job.company} />
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{a.job.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            <span className="font-medium text-text">{a.job.company}</span> &middot; {a.job.location}
            {a.autoApplied && <span className="ml-2 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary" data-testid="auto-tag">Auto-applied</span>}
          </p>
          <p className="mt-1 text-xs text-muted">
            Applied {timeAgo(a.createdAt).toLowerCase()}
            {a.updatedAt !== a.createdAt && <> &middot; updated {timeAgo(a.updatedAt).toLowerCase()}</>}
          </p>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border pt-3 sm:col-span-1 sm:grid sm:justify-items-end sm:border-0 sm:pt-0">
          <div className="flex items-center gap-3">
            <HealthChip result={applicationHealth(a.status, a.updatedAt)} />
            <StatusBadge status={a.status} />
          </div>
          <div className="grid justify-items-end gap-1">
            <ProgressSegments reached={a.reached} rejected={a.status === "rejected"} />
            <span className="sr-only">{stage}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
