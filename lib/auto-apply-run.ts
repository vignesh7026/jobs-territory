import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MatchProfile } from "@/lib/match";
import { quickApplyReadiness } from "@/lib/quick-apply";
import { buildAutoNote } from "@/lib/auto-note";
import { dueForSweep, pickJobs, remainingToday, type Candidate, type JobPick, type Rule } from "@/lib/auto-apply";

// Takes a client so the integration tests can run it against the real database as a signed-in candidate.
type Db = SupabaseClient<Database>;

export interface StoredRule extends Rule {
  includeNote: boolean;
  enabled: boolean;
  lastRunAt: string | null;
}

export async function getRule(db: Db, userId: string): Promise<StoredRule | null> {
  const { data } = await db.from("auto_apply_rules").select("*").eq("candidate_id", userId).maybeSingle();
  if (!data) return null;
  return {
    roles: data.roles, locations: data.locations, includeRemote: data.include_remote, minMatch: data.min_match,
    dailyCap: data.daily_cap, verifiedOnly: data.verified_only, includeNote: data.include_note, enabled: data.enabled, lastRunAt: data.last_run_at,
  };
}

type JobRow = {
  id: string; slug: string; title: string; location: string; work_mode: Candidate["workMode"]; level: Candidate["level"]; skills: string[];
  posted_at: string; first_posted_at: string | null; repost_count: number; is_vague: boolean | null; closes_at: string | null;
  companies: { name: string; verified: boolean } | { name: string; verified: boolean }[] | null;
};

/** Open jobs, newest first. A few hundred is plenty at this scale; the rule narrows them further. */
export async function loadCandidates(db: Db): Promise<Candidate[]> {
  const { data } = await db
    .from("jobs")
    .select("id, slug, title, location, work_mode, level, skills, posted_at, first_posted_at, repost_count, is_vague, closes_at, companies(name, verified)")
    .or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`)
    .order("posted_at", { ascending: false })
    .limit(400);
  return ((data ?? []) as unknown as JobRow[]).map((r) => {
    const c = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    return {
      id: r.id, slug: r.slug, title: r.title, company: c?.name ?? "Unknown company", location: r.location, workMode: r.work_mode, level: r.level,
      skills: r.skills, postedAt: r.posted_at, firstPostedAt: r.first_posted_at, repostCount: r.repost_count ?? 0, isVague: r.is_vague ?? false,
      closesAt: r.closes_at, companyVerified: Boolean(c?.verified),
    };
  });
}

async function appliedIds(db: Db, userId: string): Promise<Set<string>> {
  const { data } = await db.from("applications").select("job_id").eq("candidate_id", userId);
  return new Set((data ?? []).map((r) => r.job_id));
}

export async function sentLast24h(db: Db, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", userId).eq("auto_applied", true).gte("created_at", since);
  return count ?? 0;
}

/** What the rule would apply to right now, without applying. Used for the preview on the page. */
export async function previewMatches(db: Db, userId: string, rule: Rule, profile: MatchProfile): Promise<{ picks: JobPick[]; remaining: number }> {
  const [jobs, applied, sent] = await Promise.all([loadCandidates(db), appliedIds(db, userId), sentLast24h(db, userId)]);
  const remaining = remainingToday(rule.dailyCap, sent);
  // For the preview, show up to the daily cap even if today's allowance is used, so the person sees what is next.
  return { picks: pickJobs(rule, profile, jobs, applied, Math.max(remaining, rule.dailyCap)), remaining };
}

export interface RunResult {
  ran: boolean;
  reason?: string;
  applied: { applicationId: string; jobId: string; title: string; company: string; score: number }[];
}

/**
 * Apply for the candidate under their rule. Safe to call often: it stops when the rule is off, the profile is not
 * ready, the daily cap is used, or (unless forced) it ran less than 30 minutes ago. A duplicate (409) is skipped.
 */
export async function runAutoApply(db: Db, userId: string, profile: MatchProfile, opts: { force?: boolean; /** true when called with the service-role client (the scheduler): the row must then name its candidate */ service?: boolean } = {}): Promise<RunResult> {
  const rule = await getRule(db, userId);
  if (!rule) return { ran: false, reason: "No rule saved.", applied: [] };
  if (!rule.enabled) return { ran: false, reason: "Auto-apply is paused.", applied: [] };
  if (!opts.force && !dueForSweep(rule.lastRunAt)) return { ran: false, reason: "Checked recently.", applied: [] };
  const ready = quickApplyReadiness({ skills: profile.skills, hasResume: profile.hasResume, hasExperience: profile.hasExperience });
  if (!ready.ready) return { ran: false, reason: ready.reason, applied: [] };

  // Claim the run first so two tabs do not both apply.
  await db.from("auto_apply_rules").update({ last_run_at: new Date().toISOString() }).eq("candidate_id", userId);

  const [jobs, applied, sent] = await Promise.all([loadCandidates(db), appliedIds(db, userId), sentLast24h(db, userId)]);
  const picks = pickJobs(rule, profile, jobs, applied, remainingToday(rule.dailyCap, sent));
  let firstName = "";
  if (rule.includeNote && picks.length > 0) {
    const { data: me } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    firstName = (me?.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  }
  const done: RunResult["applied"] = [];
  for (const p of picks) {
    const note = rule.includeNote ? buildAutoNote({ firstName, title: p.job.title, company: p.job.company, profileSkills: profile.skills, jobSkills: p.job.skills, score: p.score }) : null;
    const row: Database["public"]["Tables"]["applications"]["Insert"] = { job_id: p.job.id, auto_applied: true, cover_note: note, ...(opts.service ? { candidate_id: userId } : {}) };
    const { data, error } = await db.from("applications").insert(row).select("id").single();
    if (error || !data) continue; // 23505 already applied, 42501 closed in the meantime: skip, never retry
    done.push({ applicationId: data.id, jobId: p.job.id, title: p.job.title, company: p.job.company, score: p.score });
  }
  return { ran: true, applied: done };
}
