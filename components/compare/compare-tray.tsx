"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/components/compare/compare-provider";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Appears at the bottom of the list pages once something is selected. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const visible = items.length > 0 && (pathname === "/jobs" || pathname === "/saved");
  const ready = items.length >= 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Jobs to compare"
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : 16 }}
          transition={t.base}
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-lg border border-border bg-surface p-3 shadow-soft"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Scale className="size-4 text-primary" aria-hidden="true" /> Compare <span className="tabular-nums text-muted">({items.length} of 3)</span>
            </p>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
              {items.map((i) => (
                <li key={i.id} className="flex max-w-full items-center gap-1 rounded-md bg-primary-soft py-1 pl-2.5 pr-1 text-sm">
                  <span className="truncate">{i.title}</span>
                  <button type="button" onClick={() => remove(i.id)} aria-label={`Remove ${i.title} from comparison`} className="grid size-7 shrink-0 place-items-center rounded text-muted hover:bg-primary/15 hover:text-text">
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <button type="button" onClick={clear} className="h-11 px-2 text-sm text-muted underline-offset-4 hover:text-text hover:underline md:h-9">
                Clear
              </button>
              {ready ? (
                <Link href={`/compare?ids=${items.map((i) => i.id).join(",")}`} className={buttonVariants({ variant: "primary" })}>
                  Compare {items.length} jobs
                </Link>
              ) : (
                <span className={cn(buttonVariants({ variant: "secondary" }), "pointer-events-none opacity-60")} aria-disabled="true">
                  Pick one more
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
