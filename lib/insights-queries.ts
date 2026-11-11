import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Insight, Outcome } from "@/lib/insights";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Notes about a company, newest first, read through the view that never exposes who wrote them. */
export async function getInsights(companyId: string, limit = 30): Promise<Insight[]> {
  if (!UUID.test(companyId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("peer_insights")
    .select("id, role_title, rounds, difficulty, outcome, experience, is_sample, created_at, mine")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    roleTitle: r.role_title as string,
    rounds: r.rounds as number,
    difficulty: r.difficulty as number,
    outcome: r.outcome as Outcome,
    experience: r.experience as string,
    isSample: Boolean(r.is_sample),
    createdAt: r.created_at as string,
    mine: Boolean(r.mine),
  }));
}

/** Has the signed-in candidate applied to any job at this company? That is what allows sharing a note. */
export async function hasAppliedToCompany(userId: string, companyId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("id, jobs!inner(company_id)").eq("candidate_id", userId).eq("jobs.company_id", companyId).limit(1);
  return (data?.length ?? 0) > 0;
}
