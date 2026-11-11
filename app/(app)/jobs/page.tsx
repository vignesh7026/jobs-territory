import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchX } from "lucide-react";
import { FilterPanel } from "@/components/jobs/filter-panel";
import { Pagination } from "@/components/jobs/pagination";
import { Results } from "@/components/jobs/results";
import { ResultsToolbar } from "@/components/jobs/results-toolbar";
import { SearchBar } from "@/components/jobs/search-bar";
import { SearchProvider } from "@/components/jobs/search-context";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { filtersHref, hasActiveFilters, parseFilters, type JobFilters } from "@/lib/jobs/filters";
import { searchJobs } from "@/lib/jobs/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { computeMatch } from "@/lib/match";
import { getMatchProfile } from "@/lib/profile/queries";

export async function generateMetadata(props: PageProps<"/jobs">): Promise<Metadata> {
  const { q } = parseFilters(await props.searchParams);
  return { title: q ? `${q} jobs` : "Jobs" };
}

export default async function JobsPage(props: PageProps<"/jobs">) {
  const filters = parseFilters(await props.searchParams);
  const result = await searchJobs(filters);

  // Asked for a page past the end (an old link, say): go to the last real page, keeping the filters.
  if (result.page !== filters.page) redirect(filtersHref({ ...filters, page: result.page }));

  // Signed-in candidates see how each result matches their skills.
  const user = await getCurrentUser();
  const mp = await getMatchProfile(user?.id ?? null);
  const matches = mp ? Object.fromEntries(result.jobs.map((j) => [j.id, computeMatch(mp, { skills: j.skills, level: j.level, workMode: j.workMode, location: j.location, title: j.title }).score])) : undefined;

  const cleared: JobFilters = { ...filters, q: "", location: "", types: [], modes: [], levels: [], page: 1, sort: "newest" };

  return (
    <SearchProvider filters={filters}>
      <section className="container py-8 md:py-10">
        <h1 className="text-3xl">Jobs</h1>
        <div className="mb-8 mt-5">
          {/* remount when the URL changes keyword/location (e.g. a chip was removed) so the inputs follow the URL */}
          <SearchBar key={`${filters.q}|${filters.location}`} initialQ={filters.q} initialLocation={filters.location} />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[14rem_1fr] lg:gap-10">
          <aside aria-label="Filters" className="lg:sticky lg:top-24">
            <FilterPanel />
          </aside>

          <div>
            <ResultsToolbar total={result.total} />
            {result.jobs.length > 0 ? (
              <>
                <Results jobs={result.jobs} matches={matches} />
                <Pagination filters={filters} page={result.page} pageCount={result.pageCount} />
              </>
            ) : (
              <EmptyState
                icon={<SearchX />}
                title="No jobs match this search"
                description={
                  hasActiveFilters(filters)
                    ? "Try removing a filter or two, or search for a broader role. Listings that have closed are not shown."
                    : "There are no open jobs right now. Check back soon."
                }
              >
                {hasActiveFilters(filters) && (
                  <Link href={filtersHref(cleared)} className={buttonVariants({ variant: "secondary" })}>
                    Clear all filters
                  </Link>
                )}
              </EmptyState>
            )}
          </div>
        </div>
      </section>
    </SearchProvider>
  );
}
