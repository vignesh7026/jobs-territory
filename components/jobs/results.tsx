"use client";

import { AnimatePresence } from "framer-motion";
import { useSearch } from "@/components/jobs/search-context";
import { JobRow } from "@/components/jobs/job-row";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobListItem } from "@/lib/jobs/queries";

export function JobRowSkeleton() {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] gap-4 rounded-lg border border-border bg-surface p-4" aria-hidden="true">
      <Skeleton className="size-11" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <div className="grid justify-items-end gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </li>
  );
}

/** While a new search is loading the list shows skeleton rows (and tells assistive tech it is busy). */
export function Results({ jobs }: { jobs: JobListItem[] }) {
  const { pending } = useSearch();
  return (
    <ul className="grid gap-3" aria-busy={pending} aria-label="Search results">
      {pending ? (
        Array.from({ length: 6 }, (_, i) => <JobRowSkeleton key={i} />)
      ) : (
        <AnimatePresence initial>
          {jobs.map((job, i) => (
            <JobRow key={job.id} job={job} index={i} />
          ))}
        </AnimatePresence>
      )}
    </ul>
  );
}
