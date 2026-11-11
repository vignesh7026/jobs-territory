import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GHOST_LABEL, ghostCheck, type GhostInput } from "@/lib/ghost";

/** Says what looks off about the listing, with the real numbers, or that nothing does. Never calls a job fake. */
export function GhostCard({ job }: { job: GhostInput }) {
  const r = ghostCheck(job);
  if (r.level === "none") {
    return (
      <Card className="p-5">
        <h2 className="inline-flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-success-fg" aria-hidden="true" /> Listing check
        </h2>
        <p className="mt-2 text-sm text-muted">Recently posted, not reposted, and specific about the work. Nothing looks off.</p>
      </Card>
    );
  }
  return (
    <Card className="p-5" data-testid="ghost-card">
      <h2 className="inline-flex items-center gap-2 text-base">
        <TriangleAlert className="size-4 text-warning-fg" aria-hidden="true" /> {GHOST_LABEL[r.level]}
      </h2>
      <ul className="mt-2 grid gap-1.5 pl-5 text-sm [&>li]:list-disc [&>li]:marker:text-muted">
        {r.reasons.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">These are signals, not proof. A short message to the recruiter can settle it before you spend time on a cover note.</p>
    </Card>
  );
}
