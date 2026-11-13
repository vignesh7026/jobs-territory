// "How does my profile compare to this job?" A score out of 100 with the parts that make it up, and a plain list of
// what is missing from the profile. Pure and deterministic, so the number always has the same explanation. It never
// says a candidate will or will not get the job: it only compares what the profile says with what the listing says.
import { estimateYears } from "@/lib/experience";
import { SKILL_VOCABULARY, skillKey } from "@/lib/skills";
import type { JobLevel, WorkMode } from "@/lib/jobs/filters";

export interface FitProfile {
  headline: string;
  summary: string;
  phone: string;
  location: string;
  skills: string[];
  experience: { title: string; company: string; period: string; description: string }[];
  education: { school: string; degree: string; year: string }[];
  hasResume: boolean;
}

export interface FitJob {
  title: string;
  level: JobLevel;
  workMode: WorkMode;
  location: string;
  skills: string[];
  summary: string;
  responsibilities: string[];
  requirements: string[];
}

export interface FitPart {
  id: "skills" | "experience" | "role" | "education" | "location" | "profile";
  label: string;
  got: number;
  max: number;
  /** one plain sentence saying why */
  note: string;
}

export interface MissingDetail {
  id: string;
  label: string;
  why: string;
  /** where to fix it on the profile page */
  href: string;
  /** how much it limits the picture: high ones are worth doing first */
  severity: "high" | "medium" | "low";
}

export interface FitReport {
  total: number;
  band: "strong" | "fair" | "weak";
  parts: FitPart[];
  matchedSkills: string[];
  missingSkills: string[];
  /** skills named in the description text (not the skills list) that the profile lacks */
  alsoMentioned: string[];
  missingDetails: MissingDetail[];
}

export const WEIGHTS = { skills: 45, experience: 20, role: 10, education: 5, location: 10, profile: 10 } as const;
const MIN_YEARS: Record<JobLevel, number> = { intern: 0, junior: 0, mid: 2, senior: 5, lead: 8 };

export const bandOf = (n: number): FitReport["band"] => (n >= 70 ? "strong" : n >= 45 ? "fair" : "weak");
export const BAND_LABEL = { strong: "Strong fit", fair: "Fair fit", weak: "Weak fit" } as const;

const STOP = new Set(["senior", "junior", "lead", "intern", "internship", "trainee", "associate", "the", "and", "of", "at", "for", "in", "to", "a", "an", "with", "work", "from", "office", "wfo", "wfh"]);
// Titles use these interchangeably, so "developer" on a profile should match "engineer" in a listing.
const SAME = new Map([["developer", "engineer"], ["programmer", "engineer"], ["dev", "engineer"], ["sde", "engineer"]]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => SAME.get(w) ?? w);

/** Share of the job title's meaningful words found in the headline or any past role title. */
export function roleOverlap(jobTitle: string, headline: string, roleTitles: string[]): number {
  const need = new Set(words(jobTitle));
  if (need.size === 0) return 0;
  const have = new Set(words([headline, ...roleTitles].join(" ")));
  let hit = 0;
  for (const w of need) if (have.has(w)) hit++;
  return hit / need.size;
}

const DEGREE = /\b(b\.?\s?e\.?|b\.?\s?tech|m\.?\s?tech|m\.?\s?e\.?|bca|mca|bba|mba|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|m\.?\s?com|llb|llm|degree|graduate|graduation|diploma|b\.?\s?arch|b\.?\s?pharm|mbbs)\b/i;
export const listingAsksForDegree = (requirements: string[]) => requirements.some((r) => DEGREE.test(r));

// Words that appear in ordinary sentences, so seeing them in a description does not mean the job asks for that skill.
const GENERIC = new Set(["go", "risk", "lean", "safety", "operations", "documentation", "empathy", "research", "editing", "analytics", "communication", "leadership", "presentation", "scheduling", "logistics", "networking", "animation", "illustration"]);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Skills the description text names that are not in the listed skills and not on the profile. */
export function alsoMentionedSkills(job: Pick<FitJob, "skills" | "summary" | "responsibilities" | "requirements">, profileSkills: string[]): string[] {
  const text = [job.summary, ...job.responsibilities, ...job.requirements].join(" \n ");
  const listed = new Set(job.skills.map(skillKey));
  const have = new Set(profileSkills.map(skillKey));
  const out: string[] = [];
  for (const s of SKILL_VOCABULARY) {
    const k = skillKey(s);
    if (GENERIC.has(s.toLowerCase()) || listed.has(k) || have.has(k)) continue;
    if (new RegExp(`(?<![A-Za-z0-9+#.])${esc(s)}(?![A-Za-z0-9+#])`, "i").test(text)) out.push(s);
  }
  return out.slice(0, 6);
}

const pts = (ratio: number, max: number) => Math.round(Math.max(0, Math.min(1, ratio)) * max);

export function fitReport(p: FitProfile, job: FitJob, now: Date = new Date()): FitReport {
  const have = new Set(p.skills.map(skillKey));
  const matchedSkills = job.skills.filter((s) => have.has(skillKey(s)));
  const missingSkills = job.skills.filter((s) => !have.has(skillKey(s)));
  const years = estimateYears(p.experience.map((e) => e.period), now);
  const need = MIN_YEARS[job.level];
  const hasExp = p.experience.some((e) => e.title.trim() || e.company.trim());
  const hasEdu = p.education.some((e) => e.school.trim() || e.degree.trim());
  const asksDegree = listingAsksForDegree(job.requirements);

  // skills
  const skillsGot = job.skills.length === 0 ? WEIGHTS.skills : pts(matchedSkills.length / job.skills.length, WEIGHTS.skills);
  const skillsNote = job.skills.length === 0 ? "The listing names no specific skills, so this part is not held against you." : `${matchedSkills.length} of ${job.skills.length} listed skills are on your profile.`;

  // experience
  let expGot: number;
  let expNote: string;
  if (need === 0) {
    expGot = WEIGHTS.experience;
    expNote = job.level === "intern" ? "An internship does not need prior experience." : "A junior role does not need prior experience.";
  } else if (years === null) {
    expGot = hasExp ? Math.round(WEIGHTS.experience * 0.5) : 0;
    expNote = hasExp ? `The role usually needs ${need}+ years; your roles have no dates we can read.` : `The role usually needs ${need}+ years and your profile has no roles.`;
  } else {
    expGot = pts(years / need, WEIGHTS.experience);
    expNote = years >= need ? `About ${years} ${years === 1 ? "year" : "years"} on your profile; the role usually needs ${need}+.` : `About ${years === 0 ? "no" : years} ${years === 1 ? "year" : "years"} on your profile; the role usually needs ${need}+.`;
  }

  // role relevance
  const overlap = roleOverlap(job.title, p.headline, p.experience.map((e) => e.title));
  const roleGot = pts(overlap * 2, WEIGHTS.role);
  const roleNote = overlap === 0 ? "Neither your headline nor your past roles share words with this job title." : overlap >= 0.5 ? "Your headline or past roles line up with this job title." : "Part of this job title appears in your headline or past roles.";

  // education
  const eduGot = !asksDegree ? WEIGHTS.education : hasEdu ? WEIGHTS.education : 0;
  const eduNote = !asksDegree ? "The listing does not ask for a particular qualification." : hasEdu ? "The listing asks for a qualification and your profile lists your education." : "The listing asks for a qualification and your profile has no education entry.";

  // location and work mode
  const here = p.location.trim().toLowerCase();
  const city = job.location.split(",")[0].trim().toLowerCase();
  let locGot: number;
  let locNote: string;
  if (job.workMode === "remote") {
    locGot = WEIGHTS.location;
    locNote = "The job is remote, so your location does not matter.";
  } else if (!job.location.trim()) {
    locGot = WEIGHTS.location;
    locNote = "No job location was given, so location is not scored.";
  } else if (!here) {
    locGot = Math.round(WEIGHTS.location * 0.5);
    locNote = `The job is in ${job.location} and your profile has no location, so we cannot tell.`;
  } else if (here.includes(city)) {
    locGot = WEIGHTS.location;
    locNote = `You are in the same place as the job (${job.location}).`;
  } else {
    locGot = 0;
    locNote = `The job is in ${job.location} and your profile says ${p.location}.`;
  }

  // profile completeness
  const profileGot = (p.hasResume ? 4 : 0) + (p.summary.trim() ? 2 : 0) + (p.phone.trim() ? 2 : 0) + (p.headline.trim() ? 2 : 0);
  const profileNote = profileGot === WEIGHTS.profile ? "Your resume, headline, summary and phone are all there." : "Some basics a recruiter looks for are missing (listed below).";

  const parts: FitPart[] = [
    { id: "skills", label: "Skills", got: skillsGot, max: WEIGHTS.skills, note: skillsNote },
    { id: "experience", label: "Experience", got: expGot, max: WEIGHTS.experience, note: expNote },
    { id: "role", label: "Role relevance", got: roleGot, max: WEIGHTS.role, note: roleNote },
    { id: "education", label: "Education", got: eduGot, max: WEIGHTS.education, note: eduNote },
    { id: "location", label: "Location", got: locGot, max: WEIGHTS.location, note: locNote },
    { id: "profile", label: "Profile basics", got: profileGot, max: WEIGHTS.profile, note: profileNote },
  ];
  const total = parts.reduce((n, x) => n + x.got, 0);

  // what is missing from the profile
  const missingDetails: MissingDetail[] = [];
  if (!p.hasResume) missingDetails.push({ id: "resume", label: "Resume", why: "Many employers will not review an application without one. Uploading a PDF also fills the rest of your profile.", href: "/profile#resume", severity: "high" });
  if (p.skills.length < 5) missingDetails.push({ id: "skills", label: p.skills.length === 0 ? "Skills" : "More skills", why: `Your profile lists ${p.skills.length}; most jobs name 4 to 6. List every skill you really have.`, href: "/profile#skills", severity: p.skills.length < 3 ? "high" : "medium" });
  if (!hasExp && need > 0) missingDetails.push({ id: "experience", label: "Work experience", why: "This job usually asks for experience and your profile has no roles. Internships and projects count.", href: "/profile#experience", severity: "high" });
  else if (!hasExp) missingDetails.push({ id: "experience", label: "Projects or internships", why: "Even for an entry-level role, one project or internship shows what you can do.", href: "/profile#experience", severity: "medium" });
  if (!hasEdu && asksDegree) missingDetails.push({ id: "education", label: "Education", why: "The listing asks for a qualification and your profile has none.", href: "/profile#education", severity: "high" });
  else if (!hasEdu) missingDetails.push({ id: "education", label: "Education", why: "Add your college or course so recruiters can see your background.", href: "/profile#education", severity: "low" });
  if (!p.summary.trim()) missingDetails.push({ id: "summary", label: "Summary", why: "Two or three lines on who you are and what you want. Recruiters read this first.", href: "/profile#summary", severity: "medium" });
  if (!p.headline.trim()) missingDetails.push({ id: "headline", label: "Headline", why: "One line such as your target role. It also helps match you to jobs.", href: "/profile#headline", severity: "medium" });
  if (!p.phone.trim()) missingDetails.push({ id: "phone", label: "Phone number", why: "Recruiters usually call first.", href: "/profile#phone", severity: "low" });
  if (!p.location.trim() && job.workMode !== "remote" && job.location.trim()) missingDetails.push({ id: "location", label: "Location", why: `This job is in ${job.location}; without your location we cannot tell if it is realistic.`, href: "/profile#location", severity: "medium" });
  const order = { high: 0, medium: 1, low: 2 } as const;
  missingDetails.sort((a, b) => order[a.severity] - order[b.severity]);

  return { total, band: bandOf(total), parts, matchedSkills, missingSkills, alsoMentioned: alsoMentionedSkills(job, p.skills), missingDetails };
}
