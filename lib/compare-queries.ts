import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toListItem, type JobListItem } from "@/lib/jobs/queries";

export interface CompareJob extends JobListItem {
  /** approximate INR value of the top salary, used only to decide which pays most across currencies */
  salaryMaxInr: number | null;
  summary: string;
}

const SELECT = "id, slug, title, location, work_mode, job_type, level, salary_min, salary_max, salary_max_inr, currency, posted_at, closes_at, skills, summary, companies(name, slug)";

/** The requested jobs, in the order asked for. Ids that no longer exist are simply missing from the result. */
export async function getJobsForCompare(ids: string[]): Promise<CompareJob[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select(SELECT).in("id", ids);
  if (error) throw new Error(`Could not load jobs to compare: ${error.message}`);
  const byId = new Map((data ?? []).map((r) => [r.id, { ...toListItem(r as never), salaryMaxInr: r.salary_max_inr, summary: r.summary }]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
