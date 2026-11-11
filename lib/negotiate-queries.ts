import "server-only";
import { createClient } from "@/lib/supabase/server";
import { marketRange, midpointInr, type MarketRange } from "@/lib/negotiate";

export interface MarketSample {
  range: MarketRange;
  /** internships are paid monthly; everything else annually */
  monthly: boolean;
}

/** Salaries of other listings with the same level and job type, preferring ones that share a skill. */
export async function getMarketSample(jobId: string): Promise<MarketSample | null> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("level, job_type, skills").eq("id", jobId).maybeSingle();
  if (!job) return null;
  const { data: rows } = await supabase
    .from("jobs")
    .select("salary_min, salary_max, salary_max_inr, skills")
    .eq("level", job.level)
    .eq("job_type", job.job_type)
    .neq("id", jobId)
    .not("salary_max", "is", null);
  const mine = new Set(job.skills.map((s) => s.toLowerCase()));
  const all = (rows ?? []).map((r) => ({ mid: midpointInr(r.salary_min, r.salary_max, r.salary_max_inr), shares: r.skills.some((s) => mine.has(s.toLowerCase())) }));
  const related = all.filter((r) => r.shares && r.mid !== null).map((r) => r.mid as number);
  const pool = related.length >= 3 ? related : all.filter((r) => r.mid !== null).map((r) => r.mid as number);
  const range = marketRange(pool);
  return range ? { range, monthly: job.job_type === "internship" } : null;
}
