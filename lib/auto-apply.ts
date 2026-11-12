// Auto-apply rules. Pure and tested: which jobs a rule would apply to, and how many are still allowed today.
// The candidate chooses roles and places; the rule never goes beyond what they chose, never applies twice, never
// applies to a closed job, and stops at the daily cap. Applications go in with the profile and no cover note.
import { z } from "zod";
import { computeMatch, type MatchProfile } from "@/lib/match";
import { ghostCheck } from "@/lib/ghost";
import type { JobLevel, WorkMode } from "@/lib/jobs/filters";

export const MAX_TERMS = 5;
export const MIN_MATCH_CHOICES = [50, 60, 70, 80] as const;
export const DAILY_CAP_CHOICES = [1, 3, 5, 10] as const;

/** "frontend, react developer" -> ["frontend", "react developer"]. Trims, drops blanks and repeats, caps the count. */
export function parseTerms(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n;]/)) {
    const t = raw.trim().replace(/\s+/g, " ");
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, MAX_TERMS);
}

export const ruleSchema = z
  .object({
    roles: z.array(z.string().trim().min(2, "A role needs at least two letters.").max(60)).min(1, "Add at least one role.").max(MAX_TERMS),
    locations: z.array(z.string().trim().min(2).max(60)).max(MAX_TERMS),
    includeRemote: z.boolean(),
    minMatch: z.number().int().min(40).max(100),
    dailyCap: z.number().int().min(1).max(10),
    verifiedOnly: z.boolean(),
    includeNote: z.boolean().default(false),
    consent: z.literal(true, { error: "Tick the box to confirm you want applications sent for you." }),
  })
  .refine((v) => v.locations.length > 0 || v.includeRemote, { message: "Choose a location, or allow remote jobs.", path: ["locations"] });
export type RuleInput = z.infer<typeof ruleSchema>;

export interface Rule {
  roles: string[];
  locations: string[];
  includeRemote: boolean;
  minMatch: number;
  dailyCap: number;
  verifiedOnly: boolean;
  includeNote?: boolean;
}

export interface Candidate {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  level: JobLevel;
  skills: string[];
  postedAt: string;
  firstPostedAt: string | null;
  repostCount: number;
  isVague: boolean;
  closesAt: string | null;
  companyVerified: boolean;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);

/** A role matches when every word of it appears in the job title ("react developer" matches "Senior React Developer"). */
export function roleMatches(role: string, title: string): boolean {
  const t = new Set(words(title));
  const need = words(role);
  return need.length > 0 && need.every((w) => t.has(w));
}

export function locationMatches(rule: Pick<Rule, "locations" | "includeRemote">, job: Pick<Candidate, "location" | "workMode">): boolean {
  if (rule.includeRemote && job.workMode === "remote") return true;
  const loc = job.location.toLowerCase();
  return rule.locations.some((l) => loc.includes(l.toLowerCase()));
}

export type Skip = "closed" | "applied" | "role" | "location" | "unverified" | "listing" | "low-match";

/** Why a job is not picked, or null when it is eligible. First failing reason wins. */
export function whySkipped(rule: Rule, profile: MatchProfile, job: Candidate, applied: Set<string>, now: Date = new Date()): { skip: Skip; score: number } | { skip: null; score: number } {
  if (job.closesAt && new Date(job.closesAt) <= now) return { skip: "closed", score: 0 };
  if (applied.has(job.id)) return { skip: "applied", score: 0 };
  if (!rule.roles.some((r) => roleMatches(r, job.title))) return { skip: "role", score: 0 };
  if (!locationMatches(rule, job)) return { skip: "location", score: 0 };
  if (rule.verifiedOnly && !job.companyVerified) return { skip: "unverified", score: 0 };
  // Never auto-apply to a listing that looks stale or vague; the candidate can still apply by hand.
  if (ghostCheck({ firstPostedAt: job.firstPostedAt, postedAt: job.postedAt, repostCount: job.repostCount, isVague: job.isVague }, now).level !== "none") return { skip: "listing", score: 0 };
  const score = computeMatch(profile, { skills: job.skills, level: job.level, workMode: job.workMode, location: job.location, title: job.title }, now).score;
  if (score < rule.minMatch) return { skip: "low-match", score };
  return { skip: null, score };
}

export interface JobPick {
  job: Candidate;
  score: number;
}

/** Eligible jobs, best match first (newest breaks ties), at most `remaining`. */
export function pickJobs(rule: Rule, profile: MatchProfile, jobs: Candidate[], applied: Set<string>, remaining: number, now: Date = new Date()): JobPick[] {
  if (remaining <= 0) return [];
  return jobs
    .map((job) => ({ job, ...whySkipped(rule, profile, job, applied, now) }))
    .filter((r) => r.skip === null)
    .map((r) => ({ job: r.job, score: r.score }))
    .sort((a, b) => b.score - a.score || new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime())
    .slice(0, remaining);
}

/** How many more the rule may send in the next 24 hours, given how many it already sent in the last 24. */
export const remainingToday = (cap: number, sentLast24h: number) => Math.max(0, cap - sentLast24h);

/** Don't sweep more often than this when the person just visits pages. */
export const SWEEP_EVERY_MS = 30 * 60 * 1000;
export const dueForSweep = (lastRunAt: string | null, now: Date = new Date()) => !lastRunAt || now.getTime() - new Date(lastRunAt).getTime() >= SWEEP_EVERY_MS;

/** Undo is allowed while an application is still 'applied' and under ten minutes old (the database enforces the same). */
export const canUndoApplication = (status: string, createdAt: string, now: Date = new Date()) => status === "applied" && now.getTime() - new Date(createdAt).getTime() < 10 * 60 * 1000;
