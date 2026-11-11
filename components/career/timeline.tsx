"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, ChevronRight, GraduationCap, MapPin } from "lucide-react";
import { MatchRing } from "@/components/match/match-ring";
import { nextLevel, type TimelineNode } from "@/lib/career";
import type { TargetRole } from "@/lib/career-queries";
import { ease } from "@/lib/motion";
import { LEVEL_LABELS, type JobLevel } from "@/lib/jobs/filters";
import { cn } from "@/lib/utils";

const ICON = { education: GraduationCap, role: Briefcase, now: MapPin } as const;

/**
 * Where you have been, where you are, and the next level up. The line draws once, top to bottom, as the section
 * appears (transform only). Each step is a button that opens the detail from your profile. With reduced motion
 * everything is simply there.
 */
export function CareerTimeline({ nodes, targets, level }: { nodes: TimelineNode[]; targets: TargetRole[]; level: JobLevel }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]" data-testid="timeline">
      <ol className="relative grid gap-2 pl-10">
        <motion.span
          aria-hidden="true"
          className="absolute bottom-3 left-[15px] top-3 w-0.5 origin-top rounded-full bg-border"
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease }}
        />
        {nodes.map((n, i) => {
          const Icon = ICON[n.kind];
          const isOpen = open === i;
          const canOpen = Boolean(n.detail);
          return (
            <motion.li
              key={`${n.kind}-${i}`}
              className="relative"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.2, ease, delay: Math.min(i, 6) * 0.04 }}
            >
              <span className={cn("absolute -left-10 top-2 grid size-8 place-items-center rounded-full border bg-surface", n.kind === "now" ? "border-primary text-primary" : "border-border text-muted")}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <button
                type="button"
                disabled={!canOpen}
                aria-expanded={canOpen ? isOpen : undefined}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn("w-full rounded-lg border border-transparent p-3 text-left transition-colors duration-fast", canOpen && "hover:border-border hover:bg-surface", n.kind === "now" && "bg-primary-soft")}
              >
                <span className="block text-xs text-muted">{n.when}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{n.title}</span>
                  {canOpen && <ChevronRight className={cn("size-4 shrink-0 text-muted transition-transform duration-fast", isOpen && "rotate-90")} aria-hidden="true" />}
                </span>
                {n.subtitle && <span className="block text-sm text-muted">{n.subtitle}</span>}
                {isOpen && <span className="mt-2 block text-sm leading-relaxed">{n.detail}</span>}
              </button>
            </motion.li>
          );
        })}
      </ol>

      <div>
        <h3 className="text-base">Next step up{nextLevel(level) ? `: ${LEVEL_LABELS[nextLevel(level)!]}` : ""}</h3>
        <p className="mt-1 text-sm text-muted">Open roles one level above where you are, best match first.</p>
        {targets.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No open roles one level up right now.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {targets.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <MatchRing score={t.score} size={44} />
                  <div className="min-w-0">
                    <Link href={`/jobs/${t.slug}`} className="block truncate text-sm font-semibold hover:text-primary">
                      {t.title}
                    </Link>
                    <p className="truncate text-xs text-muted">{t.company}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">{t.missing.length === 0 ? "You cover every listed skill." : `${t.missing.length} skill${t.missing.length === 1 ? "" : "s"} to add: ${t.missing.slice(0, 3).join(", ")}${t.missing.length > 3 ? "…" : ""}`}</p>
                <Link href={`/career?target=${t.slug}#plan`} scroll className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Plan for this role
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
