"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Search, Trash2 } from "lucide-react";
import { deleteSavedSearch, markSearchSeen, saveSearch } from "@/app/(app)/saved/actions";
import { JobRow } from "@/components/jobs/job-row";
import { useToast } from "@/components/shell/toaster";
import { buttonVariants } from "@/components/ui/button";
import { activeChips, toSearchParams, type JobFilters } from "@/lib/jobs/filters";
import type { JobListItem } from "@/lib/jobs/queries";

export function SavedJobsList({ jobs, matches }: { jobs: JobListItem[]; matches?: Record<string, number> }) {
  return (
    <ul className="grid gap-3" aria-label="Saved jobs">
      {/* removing a job (bookmark button) lets its row fade out instead of vanishing */}
      <AnimatePresence initial={false}>
        {jobs.map((j, i) => (
          <JobRow key={j.id} job={j} index={i} match={matches?.[j.id]} saved signedIn />
        ))}
      </AnimatePresence>
    </ul>
  );
}

export interface SavedSearchView {
  id: string;
  name: string;
  href: string;
  filters: JobFilters;
  /** matching jobs posted since the candidate last opened this search */
  fresh?: { count: number; capped: boolean };
}

export function SavedSearchList({ searches }: { searches: SavedSearchView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  function remove(s: SavedSearchView) {
    start(async () => {
      const r = await deleteSavedSearch(s.id);
      if (!r.ok) {
        toast({ title: "Not deleted", description: r.message, tone: "error" });
        return;
      }
      router.refresh();
      toast({
        title: "Saved search deleted",
        description: s.name,
        action: {
          label: "Undo",
          onClick: () => {
            start(async () => {
              await saveSearch({ name: s.name, query: toSearchParams(s.filters).toString() });
              router.refresh();
            });
          },
        },
      });
    });
  }

  return (
    <ul className="grid gap-3" aria-label="Saved searches">
      {searches.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {s.name}
              {s.fresh && s.fresh.count > 0 && (
                <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary" data-testid="new-matches">
                  {s.fresh.count}{s.fresh.capped ? "+" : ""} new
                </span>
              )}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Filters in this search">
              {activeChips(s.filters).map((c) => (
                <li key={c.id} className="rounded-md bg-bg px-2 py-0.5 text-xs text-muted">
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <Link href={s.href} onClick={() => void markSearchSeen(s.id)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Search aria-hidden="true" /> Run search
            </Link>
            <button type="button" onClick={() => remove(s)} disabled={pending} aria-label={`Delete saved search ${s.name}`} className="grid size-11 place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-danger/10 hover:text-danger-fg md:size-9">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
