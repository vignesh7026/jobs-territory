import { StatusBadge } from "@/components/applications/status-badge";
import { formatDateTime } from "@/lib/format";
import type { ApplicationEvent } from "@/lib/applications/queries";

/** Plain history, newest first. Every status change has a timestamp, who made it, and an optional note. */
export function EventLog({ events, candidateId, viewerIsCandidate }: { events: ApplicationEvent[]; candidateId: string; viewerIsCandidate: boolean }) {
  const ordered = [...events].reverse();
  return (
    <ol aria-label="Status history" className="grid gap-0 divide-y divide-border">
      {ordered.map((e) => {
        const byCandidate = e.actorId === candidateId;
        const who = byCandidate ? (viewerIsCandidate ? "You" : "Candidate") : "Hiring team";
        return (
          <li key={e.id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <p className="text-sm text-muted tabular-nums">{formatDateTime(e.createdAt)}</p>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={e.status} />
                <span className="text-xs text-muted">{who}</span>
              </div>
              {e.note && <p className="mt-1.5 max-w-prose text-sm">{e.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
