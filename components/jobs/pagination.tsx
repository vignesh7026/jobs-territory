import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { filtersHref, type JobFilters } from "@/lib/jobs/filters";
import { pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function Pagination({ filters, page, pageCount }: { filters: JobFilters; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => filtersHref({ ...filters, page: p });
  const cell = "grid h-11 min-w-11 place-items-center rounded-md border px-3 text-sm md:h-9 md:min-w-9";

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted tabular-nums">
        Page {page} of {pageCount}
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label="Previous page" className={cn(cell, "border-border bg-surface hover:bg-primary-soft")}>
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(cell, "border-transparent text-muted/40")}>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>
        {pageWindow(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <li key={`g${i}`} aria-hidden="true" className="px-1 text-muted">
              &hellip;
            </li>
          ) : (
            <li key={p}>
              <Link href={href(p)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined} className={cn(cell, "tabular-nums", p === page ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface hover:bg-primary-soft")}>
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} rel="next" aria-label="Next page" className={cn(cell, "border-border bg-surface hover:bg-primary-soft")}>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(cell, "border-transparent text-muted/40")}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
