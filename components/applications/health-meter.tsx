import { CheckCircle2, Clock, Hourglass } from "lucide-react";
import { HEALTH_LABEL, type Health, type HealthResult } from "@/lib/applications/health";
import { cn } from "@/lib/utils";

const META: Record<Health, { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; text: string; fill: string; level: number }> = {
  on_track: { icon: CheckCircle2, text: "text-success-fg", fill: "bg-success", level: 1 },
  follow_up: { icon: Clock, text: "text-warning-fg", fill: "bg-warning", level: 2 },
  likely_ghosted: { icon: Hourglass, text: "text-danger-fg", fill: "bg-danger", level: 3 },
};

/** Three-step meter: on track, follow up now, likely ghosted. Never colour alone: each step has an icon and a label. */
export function HealthMeter({ result }: { result: HealthResult }) {
  const m = META[result.health];
  const Icon = m.icon;
  return (
    <div>
      <p className={cn("flex items-center gap-2 text-base font-medium", m.text)}>
        <Icon className="size-5" aria-hidden /> {HEALTH_LABEL[result.health]}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5" role="img" aria-label={`Application health: ${HEALTH_LABEL[result.health]}`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-1.5 rounded-full", n <= m.level ? m.fill : "bg-border")} />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1.5 text-[11px] text-muted" aria-hidden="true">
        <span>On track</span>
        <span>Follow up</span>
        <span>Ghosted</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{result.detail}</p>
    </div>
  );
}

/** Compact version for list rows. Only shown when something needs attention. */
export function HealthChip({ result }: { result: HealthResult | null }) {
  if (!result || result.health === "on_track") return null;
  const m = META[result.health];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", m.text)}>
      <Icon className="size-3.5" aria-hidden /> {HEALTH_LABEL[result.health]}
    </span>
  );
}
