import type { JobLevel } from "@/lib/jobs/filters";

// The career timeline: where you have been (from your profile), where you are, and the next level up.
// Pure functions over profile text, so they are tested without a database.

export interface ExperienceEntry {
  title: string;
  company: string;
  period: string;
  description: string;
}
export interface EducationEntry {
  school: string;
  degree: string;
  year: string;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Jul 2023 - Present", "2021-2023", "Jan 2023 – Jun 2023" -> start/end as year fractions. null when unreadable. */
export function parsePeriod(period: string, now: Date = new Date()): { start: number; end: number; current: boolean } | null {
  const text = period.toLowerCase();
  const tokens = [...text.matchAll(/(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})/g)];
  const toYear = (m: RegExpMatchArray) => Number(m[2]) + (m[1] ? MONTHS.indexOf(m[1]) / 12 : 0);
  const nowYear = now.getFullYear() + now.getMonth() / 12;
  const current = /\b(present|current|now|ongoing)\b/.test(text);
  if (tokens.length === 0) return null;
  const start = toYear(tokens[0]);
  const end = current ? nowYear : tokens.length > 1 ? toYear(tokens[1]) : start + 1;
  return { start, end: Math.max(end, start), current };
}

const LEVEL_ORDER: JobLevel[] = ["intern", "junior", "mid", "senior", "lead"];
export const nextLevel = (l: JobLevel): JobLevel | null => LEVEL_ORDER[LEVEL_ORDER.indexOf(l) + 1] ?? null;

/** Level from the most recent title's wording, or from total years of work if the wording says nothing. */
export function estimateLevel(experience: ExperienceEntry[], now: Date = new Date()): JobLevel {
  const dated = experience.map((e) => ({ e, p: parsePeriod(e.period, now) })).sort((a, b) => (b.p?.end ?? 0) - (a.p?.end ?? 0));
  const latest = dated[0]?.e.title.toLowerCase() ?? "";
  if (/\b(intern|trainee|apprentice)\b/.test(latest)) return "intern";
  if (/\b(lead|principal|head|director|staff|manager)\b/.test(latest)) return "lead";
  if (/\bsenior|sr\.?\b/.test(latest)) return "senior";
  if (/\bjunior|jr\.?|associate\b/.test(latest)) return "junior";
  const years = dated.reduce((sum, d) => sum + (d.p ? d.p.end - d.p.start : 0), 0);
  return years < 1 ? "intern" : years < 2 ? "junior" : years < 5 ? "mid" : years < 9 ? "senior" : "lead";
}

export interface TimelineNode {
  kind: "education" | "role" | "now";
  /** short label, e.g. "2023" or "Jul 2023 to now" */
  when: string;
  title: string;
  subtitle: string;
  detail: string;
  sort: number;
}

const fmt = (n: number) => `${MONTHS[Math.min(11, Math.max(0, Math.round((n % 1) * 12)))][0].toUpperCase()}${MONTHS[Math.min(11, Math.max(0, Math.round((n % 1) * 12)))].slice(1)} ${Math.floor(n)}`;

/** Past nodes in order (education and roles), then "you are here". */
export function timelineNodes(p: { experience: ExperienceEntry[]; education: EducationEntry[]; level: JobLevel }, now: Date = new Date()): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  for (const e of p.education) {
    const y = Number(e.year.match(/(?:19|20)\d{2}/)?.[0]);
    if (!e.school && !e.degree) continue;
    nodes.push({ kind: "education", when: Number.isFinite(y) ? String(y) : "", title: e.degree || "Studied", subtitle: e.school, detail: "", sort: Number.isFinite(y) ? y : -1 });
  }
  for (const x of p.experience) {
    if (!x.title && !x.company) continue;
    const per = parsePeriod(x.period, now);
    nodes.push({
      kind: "role",
      when: per ? `${fmt(per.start)} to ${per.current ? "now" : fmt(per.end)}` : x.period,
      title: x.title || "Role",
      subtitle: x.company,
      detail: x.description,
      sort: per ? per.start : 0,
    });
  }
  nodes.sort((a, b) => a.sort - b.sort);
  nodes.push({ kind: "now", when: "Today", title: "You are here", subtitle: `Roughly ${p.level === "mid" ? "mid-level" : p.level}`, detail: "", sort: Number.POSITIVE_INFINITY });
  return nodes;
}
