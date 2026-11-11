import Link from "next/link";
import { STATUS_ICON } from "@/components/applications/status-badge";
import { STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

/** Status filter as real links, so the filter is in the URL and works without JavaScript. */
export function StatusFilter({ base, active, counts, total }: { base: string; active?: ApplicationStatus; counts: Record<string, number>; total: number }) {
  const chip = "inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-fast md:h-9";
  return (
    <nav aria-label="Filter by status">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href={base} aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface hover:bg-primary-soft")}>
            All <span className="tabular-nums text-muted">{total}</span>
          </Link>
        </li>
        {STATUSES.filter((s) => (counts[s] ?? 0) > 0 || s === active).map((s) => {
          const Icon = STATUS_ICON[s];
          return (
            <li key={s}>
              <Link href={`${base}?status=${s}`} aria-current={active === s ? "page" : undefined} className={cn(chip, active === s ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface hover:bg-primary-soft")}>
                <Icon className="size-3.5" aria-hidden />
                {STATUS_LABELS[s]} <span className="tabular-nums text-muted">{counts[s] ?? 0}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
