// Turn what was read from a resume into profile fields. Pure and tested. The rule that matters: it only ever FILLS
// what is empty (and adds missing skills); it never overwrites something the candidate already wrote.
import type { ParsedResume } from "@/lib/resume";
import { canonicalSkill } from "@/lib/skills";
import { isGithubUsername } from "@/lib/portfolio";

export interface FillableProfile {
  fullName: string;
  phone: string;
  location: string;
  headline: string;
  githubUsername: string;
  summary: string;
  skills: string[];
  experience: { title: string; company: string; period: string; description: string }[];
  education: { school: string; degree: string; year: string }[];
}

const PHONE = /^\+?[0-9][0-9\s\-()]{6,18}$/;
const YEAR = /^(19|20)\d{2}(\s*[-–]\s*((19|20)\d{2}|present))?$/i;
const clip = (s: string, n: number) => s.trim().slice(0, n);

export interface FillResult {
  values: FillableProfile;
  /** plain labels of what was filled, for the message shown to the person */
  filled: string[];
}

export function fillFromResume(current: FillableProfile, p: ParsedResume, nameFromResume = ""): FillResult {
  const v: FillableProfile = { ...current, skills: [...current.skills], experience: [...current.experience], education: [...current.education] };
  const filled: string[] = [];

  if (!v.fullName.trim() && /^[A-Za-z][A-Za-z .'-]{1,118}$/.test(nameFromResume)) {
    v.fullName = clip(nameFromResume, 120);
    filled.push("name");
  }
  if (!v.phone.trim() && PHONE.test(p.phone.trim())) {
    v.phone = p.phone.trim();
    filled.push("phone");
  }
  if (!v.location.trim() && p.location.trim()) {
    v.location = clip(p.location, 120);
    filled.push("location");
  }
  if (!v.headline.trim() && p.headline.trim()) {
    v.headline = clip(p.headline, 160);
    filled.push("headline");
  }
  if (!v.summary.trim() && p.bio.trim()) {
    v.summary = clip(p.bio, 2000);
    filled.push("summary");
  }
  const gh = /github\.com\/([\w-]+)/i.exec(p.links.github)?.[1] ?? "";
  if (!v.githubUsername.trim() && gh && isGithubUsername(gh)) {
    v.githubUsername = gh;
    filled.push("GitHub username");
  }

  // skills: add the ones not already listed (compared ignoring case), up to the profile's limit of 40
  const have = new Set(v.skills.map((s) => s.toLowerCase()));
  let added = 0;
  for (const raw of p.skills) {
    const s = canonicalSkill(clip(raw, 40));
    if (!s || have.has(s.toLowerCase()) || v.skills.length >= 40) continue;
    have.add(s.toLowerCase());
    v.skills.push(s);
    added++;
  }
  if (added > 0) filled.push(`${added} ${added === 1 ? "skill" : "skills"}`);

  // roles and education: only when the profile has none, so nothing the person wrote is ever replaced
  if (v.experience.length === 0 && p.experience.length > 0) {
    v.experience = p.experience.slice(0, 15).map((e) => ({
      title: clip(e.title, 120),
      company: clip(e.company, 120) || "Company not listed",
      period: clip(e.period, 60),
      description: clip(e.description, 800),
    }));
    filled.push(`${v.experience.length} ${v.experience.length === 1 ? "role" : "roles"}`);
  }
  if (v.education.length === 0 && p.education.length > 0) {
    v.education = p.education.slice(0, 10).map((e) => ({
      school: clip(e.school, 120) || "School not listed",
      degree: clip(e.degree, 120) || "Degree not listed",
      year: YEAR.test(e.year.trim()) ? e.year.trim() : "",
    }));
    filled.push(`${v.education.length} education ${v.education.length === 1 ? "entry" : "entries"}`);
  }

  return { values: v, filled };
}
