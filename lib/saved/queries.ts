import "server-only";
import { createClient } from "@/lib/supabase/server";
import { filtersHref, parseFilters, type JobFilters } from "@/lib/jobs/filters";
import { toListItem, type JobListItem } from "@/lib/jobs/queries";

const JOB = "id, slug, title, location, work_mode, job_type, level, salary_min, salary_max, currency, posted_at, closes_at, skills, companies(name, slug)";

/** Ids of the jobs the signed-in candidate has saved (for filling in the bookmark state on lists). */
export async function getSavedJobIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("job_id").eq("candidate_id", userId);
  return new Set((data ?? []).map((r) => r.job_id));
}

/** Saved jobs, most recently saved first. Closed jobs stay visible, flagged by closesAt, so nothing silently vanishes. */
export async function listSavedJobs(userId: string): Promise<JobListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_jobs").select(`created_at, jobs(${JOB})`).eq("candidate_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load saved jobs: ${error.message}`);
  return (data ?? []).flatMap((r) => {
    const job = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
    return job ? [toListItem(job as never)] : [];
  });
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: JobFilters;
  href: string;
  createdAt: string;
}

/** Saved searches. The stored query string is re-parsed on the way out, so a hand-edited row can never produce a bad filter. */
export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_searches").select("id, name, query, created_at").eq("candidate_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load saved searches: ${error.message}`);
  return (data ?? []).map((r) => {
    const qs = typeof (r.query as { qs?: unknown } | null)?.qs === "string" ? (r.query as { qs: string }).qs : "";
    const filters = parseFilters(new URLSearchParams(qs));
    return { id: r.id, name: r.name, filters, href: filtersHref(filters), createdAt: r.created_at };
  });
}
