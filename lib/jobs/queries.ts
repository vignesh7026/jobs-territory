import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type JobFilters, type JobLevel, type JobType, type WorkMode } from "@/lib/jobs/filters";

export interface JobListItem {
  id: string;
  slug: string;
  title: string;
  location: string;
  workMode: WorkMode;
  jobType: JobType;
  level: JobLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  postedAt: string;
  closesAt: string | null;
  skills: string[];
  firstPostedAt: string | null;
  repostCount: number;
  isVague: boolean;
  company: { name: string; slug: string };
}

export interface SearchResult {
  jobs: JobListItem[];
  total: number;
  page: number;
  pageCount: number;
}

const SELECT = "id, slug, title, location, work_mode, job_type, level, salary_min, salary_max, currency, posted_at, closes_at, skills, first_posted_at, repost_count, is_vague, companies(name, slug)";

type Row = {
  id: string; slug: string; title: string; location: string; work_mode: WorkMode; job_type: JobType; level: JobLevel;
  salary_min: number | null; salary_max: number | null; currency: string; posted_at: string; closes_at: string | null; skills: string[];
  first_posted_at?: string | null; repost_count?: number; is_vague?: boolean | null;
  companies: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export function toListItem(r: Row): JobListItem {
  const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
  return {
    id: r.id, slug: r.slug, title: r.title, location: r.location, workMode: r.work_mode, jobType: r.job_type, level: r.level,
    salaryMin: r.salary_min, salaryMax: r.salary_max, currency: r.currency, postedAt: r.posted_at, closesAt: r.closes_at, skills: r.skills,
    firstPostedAt: r.first_posted_at ?? null, repostCount: r.repost_count ?? 0, isVague: r.is_vague ?? false,
    company: company ?? { name: "Unknown company", slug: "" },
  };
}

async function page(filters: JobFilters, pageNumber: number, size = PAGE_SIZE) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_jobs", {
    p_q: filters.q || undefined,
    p_location: filters.location || undefined,
    p_types: filters.types,
    p_modes: filters.modes,
    p_levels: filters.levels,
    p_sort: filters.sort,
    p_limit: size,
    p_offset: (pageNumber - 1) * size,
  });
  if (error) throw new Error(`Job search failed: ${error.message}`);
  return { rows: data ?? [], supabase };
}

/** One page of results. If the requested page is past the end, returns the last page and says which page it is. */
export async function searchJobs(filters: JobFilters): Promise<SearchResult> {
  let pageNumber = filters.page;
  let { rows, supabase } = await page(filters, pageNumber);

  if (rows.length === 0 && pageNumber > 1) {
    const first = await page(filters, 1);
    const total = Number(first.rows[0]?.total ?? 0);
    pageNumber = Math.max(1, Math.ceil(total / PAGE_SIZE));
    ({ rows, supabase } = pageNumber === 1 ? first : await page(filters, pageNumber));
  }

  const total = Number(rows[0]?.total ?? 0);
  const ids = rows.map((r) => r.job_id);
  if (ids.length === 0) return { jobs: [], total, page: pageNumber, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };

  const { data, error } = await supabase.from("jobs").select(SELECT).in("id", ids);
  if (error) throw new Error(`Could not load jobs: ${error.message}`);
  // The search function decided the order; the second query does not preserve it.
  const byId = new Map((data as unknown as Row[]).map((r) => [r.id, toListItem(r)]));
  const jobs = ids.map((id) => byId.get(id)).filter((j): j is JobListItem => Boolean(j));

  return { jobs, total, page: pageNumber, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

const POOL_PAGE = 50;
const POOL_CAP = 400; // quick apply looks at the best 400 open jobs for the other filters; plenty at this scale

/**
 * Quick apply results. Whether a job qualifies depends on the candidate's own profile, which the database does not
 * hold in comparable form, so this pulls the candidate pool for the other filters (in the database's order) and
 * applies the profile rule here, then paginates. Everything stays in the order the search function gave.
 */
export async function searchQuickApply(filters: JobFilters, qualifies: (j: JobListItem) => boolean): Promise<SearchResult> {
  const ids: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  for (let n = 1; ids.length < POOL_CAP; n++) {
    const res = await page(filters, n, POOL_PAGE);
    supabase = res.supabase;
    ids.push(...res.rows.map((r) => r.job_id));
    if (res.rows.length < POOL_PAGE) break;
  }
  if (!supabase || ids.length === 0) return { jobs: [], total: 0, page: 1, pageCount: 1 };

  const byId = new Map<string, JobListItem>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from("jobs").select(SELECT).in("id", ids.slice(i, i + 100));
    if (error) throw new Error(`Could not load jobs: ${error.message}`);
    for (const r of data as unknown as Row[]) byId.set(r.id, toListItem(r));
  }
  const all = ids.map((id) => byId.get(id)).filter((j): j is JobListItem => j !== undefined && qualifies(j));
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageNumber = Math.min(filters.page, pageCount);
  return { jobs: all.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE), total: all.length, page: pageNumber, pageCount };
}

/** Ids of the jobs the signed-in candidate has already applied to. */
export async function getAppliedJobIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("job_id").eq("candidate_id", userId);
  return new Set((data ?? []).map((r) => r.job_id));
}
