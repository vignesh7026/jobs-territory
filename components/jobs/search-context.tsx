"use client";

import { createContext, useCallback, useContext, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { filtersHref, type JobFilters } from "@/lib/jobs/filters";

interface SearchContextValue {
  /** The filters as the person just set them. Updates instantly, before the server has returned new results. */
  filters: JobFilters;
  /** true while a new set of results is loading */
  pending: boolean;
  /** put these filters in the URL; the server renders the new results */
  push: (filters: JobFilters) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider>");
  return ctx;
}

/**
 * The URL is the source of truth; the server renders results for it.
 * `filters` comes from the URL. While a navigation is in flight it is replaced by the optimistic value, so quick
 * successive clicks build on each other instead of each one starting from the old URL.
 */
export function SearchProvider({ filters: fromUrl, children }: { filters: JobFilters; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filters, setOptimistic] = useOptimistic(fromUrl);

  const push = useCallback(
    (next: JobFilters) =>
      start(() => {
        setOptimistic(next);
        router.replace(filtersHref(next), { scroll: false });
      }),
    [router, setOptimistic],
  );

  const value = useMemo(() => ({ filters, pending, push }), [filters, pending, push]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
