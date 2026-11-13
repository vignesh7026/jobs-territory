import Link from "next/link";
import { CheckCircle2, CircleAlert, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BAND_LABEL, type FitReport } from "@/lib/fit";
import { cn } from "@/lib/utils";

const BAND_TEXT = { strong: "text-success-fg", fair: "text-warning-fg", weak: "text-danger-fg" } as const;
const BAR = { strong: "bg-success", fair: "bg-warning", weak: "bg-danger" } as const;

/**
 * Profile vs this job, out of 100, with the parts that add up to it and a plain list of what is missing. The number
 * is a comparison of two texts, not a prediction: the note under each part says exactly why it got its points.
 */
export function FitReportCard({ report, jobTitle }: { report: FitReport; jobTitle: string }) {
  const r = report;
  return (
    <Card className="p-5" data-testid="fit-report">
      <h2 className="text-base">Your profile vs this job</h2>
      <div className="mt-3 flex items-end gap-3">
        <p className="font-heading text-5xl font-semibold leading-none tabular-nums" data-testid="fit-total">
          {r.total}
          <span className="text-2xl text-muted"> / 100</span>
        </p>
        <p className={cn("pb-1 text-sm font-medium", BAND_TEXT[r.band])}>{BAND_LABEL[r.band]}</p>
      </div>
      <span className="mt-3 block h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <span className={cn("block h-full origin-left rounded-full", BAR[r.band])} style={{ transform: `scaleX(${r.total / 100})` }} />
      </span>
      <p className="mt-2 text-xs text-muted">Compares your whole profile (skills, experience, education, location, basics) with the {jobTitle} listing. Not a prediction of the outcome.</p>

      <ul className="mt-4 grid gap-3" aria-label="How the score adds up">
        {r.parts.map((p) => (
          <li key={p.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{p.label}</span>
              <span className="tabular-nums text-muted">{p.got} / {p.max}</span>
            </div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <span className="block h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${p.got / p.max})` }} />
            </span>
            <p className="mt-1 text-xs text-muted">{p.note}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 inline-flex items-center gap-2 text-sm">
        <ListChecks className="size-4" aria-hidden="true" /> Skills
      </h3>
      <div className="mt-2 grid gap-2 text-sm">
        {r.matchedSkills.length > 0 && (
          <p className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-fg" aria-hidden="true" />
            <span><span className="font-medium">You have:</span> {r.matchedSkills.join(", ")}</span>
          </p>
        )}
        {r.missingSkills.length > 0 && (
          <p className="flex gap-2" data-testid="fit-missing-skills">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-fg" aria-hidden="true" />
            <span><span className="font-medium">Missing from your profile:</span> {r.missingSkills.join(", ")}</span>
          </p>
        )}
        {r.alsoMentioned.length > 0 && (
          <p className="flex gap-2 text-muted">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Also mentioned in the description: {r.alsoMentioned.join(", ")}</span>
          </p>
        )}
        {r.missingSkills.length === 0 && r.matchedSkills.length > 0 && <p className="text-muted">Every listed skill is on your profile.</p>}
      </div>

      <h3 className="mt-5 text-sm">Missing from your profile</h3>
      {r.missingDetails.length === 0 ? (
        <p className="mt-2 flex gap-2 text-sm text-muted" data-testid="fit-nothing-missing">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-fg" aria-hidden="true" /> Nothing important is missing. Your profile basics are complete.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2" data-testid="fit-missing-details">
          {r.missingDetails.map((m) => (
            <li key={m.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">
                <Link href={m.href} className="hover:text-primary">{m.label}</Link>
                {m.severity === "high" && <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger-fg">Do first</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted">{m.why}</p>
              <Link href={m.href} className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline">Fix on your profile</Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
