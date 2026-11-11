"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { HealthChip } from "@/components/applications/health-meter";
import { STATUS_ICON } from "@/components/applications/status-badge";
import { CompanyMark } from "@/components/jobs/job-row";
import type { HealthResult } from "@/lib/applications/health";
import { STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/applications/status";
import { t } from "@/lib/motion";

export interface BoardApp {
  id: string;
  title: string;
  company: string;
  status: ApplicationStatus;
  /** pre-formatted on the server so server and browser render the same text */
  updated: string;
  health: HealthResult | null;
}

const REFRESH_MS = 20_000;

/**
 * Every application as a card in the column for its status. When a status changes (an admin moves it), the card glides
 * to its new column. The board re-checks the server every 20 seconds and whenever the tab regains focus.
 */
export function Board({ apps }: { apps: BoardApp[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return (
    <LayoutGroup>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0" data-testid="board">
        {STATUSES.map((status) => {
          const items = apps.filter((a) => a.status === status);
          const Icon = STATUS_ICON[status];
          return (
            <section key={status} aria-labelledby={`col-${status}`} className="w-[17rem] shrink-0 snap-start rounded-lg border border-border bg-bg p-2.5 md:w-auto md:min-w-[11.5rem] md:flex-1">
              <h2 id={`col-${status}`} className="mb-2.5 flex items-center justify-between px-1 text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Icon className="size-4 text-muted" aria-hidden />
                  {STATUS_LABELS[status]}
                </span>
                <span className="tabular-nums text-muted">{items.length}</span>
              </h2>
              <ul className="grid min-h-12 content-start gap-2" data-column={status}>
                <AnimatePresence initial={false}>
                  {items.map((a) => (
                    <motion.li key={a.id} layout={!reduce} layoutId={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduce ? { duration: 0 } : { ...t.slow, layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }} data-app={a.id}>
                      <Link href={`/applications/${a.id}`} className="block rounded-md border border-border bg-surface p-3 transition-shadow duration-base hover:shadow-soft">
                        <div className="flex items-start gap-2.5">
                          <CompanyMark name={a.company} className="size-8 text-sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">{a.title}</p>
                            <p className="truncate text-xs text-muted">{a.company}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                          <span>{a.updated}</span>
                          <HealthChip result={a.health} />
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {items.length === 0 && <li className="px-1 py-3 text-xs text-muted">None</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
