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
import { filtersHref, hasActiveFilters, parseFilters, type JobFilters, type JobLevel, type WorkMode } from "@/lib/jobs/filters";
import { getAppliedJobIds, searchJobs, searchQuickApply } from "@/lib/jobs/queries";
import { isQuickApplyJob, quickApplyReadiness } from "@/lib/quick-apply";
import { getCurrentUser } from "@/lib/auth/session";
import { computeMatch } from "@/lib/match";
import { getMatchProfile } from "@/lib/profile/queries";
import { getSavedJobIds } from "@/lib/saved/queries";

export async function generateMetadata(props: PageProps<"/jobs">): Promise<Metadata> {
  const { q } = parseFilters(await props.searchParams);
  return { title: q ? `${q} jobs` : "Jobs" };
}

export default async function JobsPage(props: PageProps<"/jobs">) {
  const filters = parseFilters(await props.searchParams);
  const user = await getCurrentUser();
  const mp = await getMatchProfile(user?.id ?? null);
  const matchOf = (j: { skills: string[]; level: JobLevel; workMode: WorkMode; location: string; title: string }) => (mp ? computeMatch(mp, { skills: j.skills, level: j.level, workMode: j.workMode, location: j.location, title: j.title }).score : 0);

  // Quick apply needs a signed-in candidate whose profile is ready; otherwise say what is missing and show normal results.
  let quickNote: string | null = null;
  let quickOn = false;
  if (filters.quick) {
    const readiness = !user || !mp ? { ready: false as const, reason: "Sign in to use Quick apply." } : quickApplyReadiness({ skills: mp.skills, hasResume: mp.hasResume, hasExperience: mp.hasExperience });
    if (readiness.ready) quickOn = true;
    else quickNote = readiness.reason;
  }
  const applied = quickOn ? await getAppliedJobIds(user!.id) : new Set<string>();
  const result = quickOn
    ? await searchQuickApply(filters, (j) => isQuickApplyJob({ score: matchOf(j), applied: applied.has(j.id), closed: false }))
    : await searchJobs({ ...filters, quick: false });

  // Asked for a page past the end (an old link, say): go to the last real page, keeping the filters.
  if (result.page !== filters.page) redirect(filtersHref({ ...filters, page: result.page }));

  // Signed-in candidates see how each result matches their skills.
  const matches = mp ? Object.fromEntries(result.jobs.map((j) => [j.id, matchOf(j)])) : undefined;

  const savedIds = [...(await getSavedJobIds(user?.id ?? null))];

  const cleared: JobFilters = { ...filters, q: "", location: "", types: [], modes: [], levels: [], quick: false, page: 1, sort: "newest" };

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
            <FilterPanel signedIn={Boolean(user)} />
          </aside>

          <div>
            <ResultsToolbar total={result.total} signedIn={Boolean(user)} />
            {quickNote && (
              <p role="status" className="mb-4 rounded-md border border-border bg-surface p-3 text-sm">
                {quickNote} <Link href={user ? "/profile" : "/login?next=/jobs"} className="font-medium text-primary underline-offset-4 hover:underline">{user ? "Open profile" : "Sign in"}</Link>
              </p>
            )}
            {result.jobs.length > 0 ? (
              <>
                <Results jobs={result.jobs} matches={matches} savedIds={savedIds} signedIn={Boolean(user)} quick={quickOn} />
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
