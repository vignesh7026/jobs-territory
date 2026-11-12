import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { SavedJobsList, SavedSearchList } from "@/components/saved/saved-lists";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { computeMatch } from "@/lib/match";
import { getMatchProfile } from "@/lib/profile/queries";
import { countNewMatches, listSavedJobs, listSavedSearches } from "@/lib/saved/queries";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await requireUser("/saved");
  const [jobs, searches, mp] = await Promise.all([listSavedJobs(user.id), listSavedSearches(user.id), getMatchProfile(user.id)]);
  const fresh = await countNewMatches(searches);
  const matches = mp ? Object.fromEntries(jobs.map((j) => [j.id, computeMatch(mp, { skills: j.skills, level: j.level, workMode: j.workMode, location: j.location, title: j.title }).score])) : undefined;

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Saved</h1>
      <p className="mb-8 mt-2 max-w-prose text-muted">Jobs you bookmarked and searches you want to run again. Jobs that have closed stay here so you can see what you saved.</p>

      <div className="grid gap-12">
        <section aria-labelledby="saved-jobs">
          <h2 id="saved-jobs" className="mb-4 text-xl">
            Saved jobs <span className="text-base font-normal tabular-nums text-muted">({jobs.length})</span>
          </h2>
          {jobs.length > 0 ? (
            <SavedJobsList jobs={jobs} matches={matches} />
          ) : (
            <EmptyState icon={<Bookmark />} title="No saved jobs yet" description="Tap the bookmark on any job to keep it here. It is the easiest way to come back to roles you are still thinking about.">
              <Link href="/jobs" className={buttonVariants({ variant: "primary" })}>
                Browse jobs
              </Link>
            </EmptyState>
          )}
        </section>

        <section aria-labelledby="saved-searches">
          <h2 id="saved-searches" className="mb-4 text-xl">
            Saved searches <span className="text-base font-normal tabular-nums text-muted">({searches.length})</span>
          </h2>
          {searches.length > 0 ? (
            <SavedSearchList searches={searches.map((s) => ({ id: s.id, name: s.name, href: s.href, filters: s.filters, fresh: fresh[s.id] }))} />
          ) : (
            <EmptyState icon={<Search />} title="No saved searches yet" description="Search for something, add a filter or two, then choose Save this search. Run it again later with one click.">
              <Link href="/jobs" className={buttonVariants({ variant: "secondary" })}>
                Start a search
              </Link>
            </EmptyState>
          )}
        </section>
      </div>
    </section>
  );
}
