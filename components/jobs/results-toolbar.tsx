"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useSearch } from "@/components/jobs/search-context";
import { SORTS, SORT_LABELS, activeChips, withFilters, type JobFilters } from "@/lib/jobs/filters";
import { t } from "@/lib/motion";

export function ResultsToolbar({ total }: { total: number }) {
  const { filters, push, pending } = useSearch();
  const reduce = useReducedMotion();
  const chips = activeChips(filters);

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Announced to screen readers whenever the results change. */}
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {pending ? "Searching" : total === 0 ? "No jobs found" : (
            <>
              <span className="font-medium tabular-nums text-text">{total.toLocaleString("en-IN")}</span> {total === 1 ? "job" : "jobs"}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted">
            Sort by
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => push(withFilters(filters, { sort: e.target.value as JobFilters["sort"] }))}
            className="h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-9"
          >
            {SORTS.map((s) => (
              <option key={s} value={s} disabled={s === "relevance" && !filters.q}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          <AnimatePresence initial={false}>
            {chips.map((c) => (
              <motion.li
                key={c.id}
                layout={!reduce}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                transition={t.fast}
              >
                <button
                  type="button"
                  onClick={() => push(c.without)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-soft pl-2.5 pr-1.5 text-sm text-text transition-colors duration-fast hover:bg-primary/20"
                  aria-label={`Remove filter: ${c.label}`}
                >
                  {c.label}
                  <X className="size-3.5 text-muted" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
