// Match score and honest gaps, computed from the candidate's profile and the job. Pure and deterministic:
// this is the answer on its own, and the fallback whenever the AI layer is unavailable.
import { estimateYears } from "@/lib/experience";
import { skillKey } from "@/lib/skills";
import type { JobLevel, WorkMode } from "@/lib/jobs/filters";

export interface MatchProfile {
  skills: string[];
  location: string | null;
  experiencePeriods: string[];
  hasExperience: boolean;
  hasResume: boolean;
}
export interface MatchJob {
  skills: string[];
  level: JobLevel;
  workMode: WorkMode;
  location: string;
  title: string;
}

export type Tier = "strong" | "partial" | "low";
export interface Gap {
  id: string;
  severity: "high" | "medium" | "low";
  text: string;
}
export interface MatchResult {
  /** 0-100, the share of the job's listed skills the candidate has */
  score: number;
  tier: Tier;
  matched: string[];
  missing: string[];
  gaps: Gap[];
  /** about how many years the profile shows, or null if it cannot be read */
  years: number | null;
}

const MIN_YEARS: Record<JobLevel, number> = { intern: 0, junior: 0, mid: 2, senior: 5, lead: 8 };
const LEVEL_NAME: Record<JobLevel, string> = { intern: "an internship", junior: "a junior role", mid: "a mid-level role", senior: "a senior role", lead: "a lead role" };
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export const tierOf = (score: number): Tier => (score >= 70 ? "strong" : score >= 40 ? "partial" : "low");
export const TIER_LABEL: Record<Tier, string> = { strong: "Strong match", partial: "Partial match", low: "Low overlap" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function computeMatch(profile: MatchProfile, job: MatchJob, now: Date = new Date()): MatchResult {
  const have = new Set(profile.skills.map(skillKey));
  const matched = job.skills.filter((s) => have.has(skillKey(s)));
  const missing = job.skills.filter((s) => !have.has(skillKey(s)));
  const score = job.skills.length === 0 ? 0 : Math.round((matched.length / job.skills.length) * 100);
  const years = estimateYears(profile.experiencePeriods, now);

  const gaps: Gap[] = [];

  if (profile.skills.length < 3) {
    gaps.push({ id: "thin-profile", severity: "high", text: "Your profile lists very few skills, so this score is probably lower than the truth. Add the skills you actually have." });
  } else if (missing.length > 0) {
    const primary = missing.slice(0, 3);
    gaps.push({
      id: "skills",
      severity: missing.length >= Math.ceil(job.skills.length / 2) ? "high" : "medium",
      text: `The listing asks for ${list(primary)}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}, which ${missing.length === 1 ? "is" : "are"} not on your profile.`,
    });
  }

  const need = MIN_YEARS[job.level];
  if (need > 0) {
    if (years !== null && years < need) {
      gaps.push({ id: "level", severity: need - years >= 2 ? "high" : "medium", text: `This is ${LEVEL_NAME[job.level]}, usually ${need}+ years. Your profile shows about ${years === 0 ? "no" : years} ${years === 1 ? "year" : "years"}.` });
    } else if (years === null) {
      gaps.push({ id: "level-unknown", severity: "medium", text: `This is ${LEVEL_NAME[job.level]}, usually ${need}+ years, and your experience entries have no dates we can read.` });
    }
  } else if (job.level === "intern" && years !== null && years >= 3) {
    gaps.push({ id: "overqualified", severity: "low", text: `This is an internship and your profile shows about ${years} years of experience. The employer may expect a student or recent graduate.` });
  }

  if (job.workMode !== "remote") {
    const here = (profile.location ?? "").toLowerCase();
    const city = job.location.split(",")[0].trim().toLowerCase();
    if (!here) gaps.push({ id: "location-unknown", severity: "low", text: `This role is ${job.workMode === "onsite" ? "on-site" : "hybrid"} in ${job.location}. Add your location so we can tell if it is realistic.` });
    else if (!here.includes(city)) gaps.push({ id: "location", severity: "medium", text: `This role is ${job.workMode === "onsite" ? "on-site" : "hybrid"} in ${job.location}; your profile says ${profile.location}.` });
  }

  if (!profile.hasResume) gaps.push({ id: "resume", severity: "medium", text: "You have no resume on file. Many employers will not review an application without one." });
  if (!profile.hasExperience && need > 0) gaps.push({ id: "experience", severity: "low", text: "Your profile has no experience entries." });

  gaps.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { score, tier: tierOf(score), matched, missing, gaps, years };
}

/** Two plain lines explaining the score. Used as is when the AI layer is unavailable, and as its safety net. */
export function fallbackExplanation(m: MatchResult, jobSkillCount: number): [string, string] {
  const first =
    jobSkillCount === 0
      ? "This listing does not name specific skills, so there is nothing to compare."
      : m.matched.length === 0
        ? `None of the ${plural(jobSkillCount, "skill")} listed for this job are on your profile.`
        : `You have ${m.matched.length} of the ${plural(jobSkillCount, "listed skill")}: ${list(m.matched.slice(0, 4))}${m.matched.length > 4 ? " and more" : ""}.`;
  const top = m.gaps[0];
  const second = top ? top.text : "Nothing stands out as a gap. Your profile lines up with what this listing asks for.";
  return [first, second];
}
