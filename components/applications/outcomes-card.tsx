import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Outcomes } from "@/lib/outcomes";

/** Plain numbers from the candidate's own applications. Small samples say so; there is no outside benchmark here. */
export function OutcomesCard({ o }: { o: Outcomes }) {
  return (
    <Card className="mb-6 p-5" data-testid="outcomes">
      <h2 className="inline-flex items-center gap-2 text-base">
        <BarChart3 className="size-4" aria-hidden="true" /> How your applications are going
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Got a reply</dt>
          <dd className="text-2xl font-semibold tabular-nums">{o.rate}%</dd>
          <dd className="text-xs text-muted">{o.responded} of {o.total}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Typical wait for a reply</dt>
          <dd className="text-2xl font-semibold tabular-nums">{o.medianDays === null ? "n/a" : `${o.medianDays} ${o.medianDays === 1 ? "day" : "days"}`}</dd>
          <dd className="text-xs text-muted">{o.medianDays === null ? "needs two replies" : "median"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Interviews</dt>
          <dd className="text-2xl font-semibold tabular-nums">{o.interviews}</dd>
          <dd className="text-xs text-muted">{o.offers} {o.offers === 1 ? "offer" : "offers"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Still waiting</dt>
          <dd className="text-2xl font-semibold tabular-nums">{o.waiting}</dd>
          <dd className="text-xs text-muted">{o.slow > 0 ? `${o.slow} longer than usual` : "none overdue"}</dd>
        </div>
      </dl>
      {o.autoVsManual && (
        <p className="mt-4 text-sm" data-testid="auto-vs-manual">
          {o.autoVsManual.map((s) => `${s.label}: ${s.responded} of ${s.total} replied (${s.rate}%)`).join(" · ")}
        </p>
      )}
      {o.smallSample && <p className="mt-3 text-xs text-muted">Based on only {o.total} applications, so treat this as a rough start.</p>}
    </Card>
  );
}
