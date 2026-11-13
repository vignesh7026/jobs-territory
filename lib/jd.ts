// Turn a pasted job description into the shape the fit report reads. Heuristic and honest about it: skills come from the
// shared vocabulary, the level from "N years" or words like senior/intern, and nothing is invented beyond what the text says.
import { SKILL_VOCABULARY } from "@/lib/skills";
import type { FitJob } from "@/lib/fit";
import type { JobLevel } from "@/lib/jobs/filters";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "Go" and plain words that read like skills in ordinary sentences are not taken from free text.
const AMBIGUOUS = new Set(["go", "lean", "risk", "safety", "empathy", "research", "editing", "scheduling", "networking", "operations"]);

export function skillsInText(text: string): string[] {
  const out: string[] = [];
  for (const s of SKILL_VOCABULARY) {
    if (AMBIGUOUS.has(s.toLowerCase())) continue;
    if (new RegExp(`(?<![A-Za-z0-9+#.])${esc(s)}(?![A-Za-z0-9+#])`, "i").test(text)) out.push(s);
  }
  return out.slice(0, 20);
}

/** Level from the text: an explicit "N years", else a seniority word in the title or text, else mid-level. */
export function levelFromText(title: string, text: string): JobLevel {
  const all = `${title}\n${text}`;
  if (/\b(intern|internship|trainee)\b/i.test(title)) return "intern";
  const yrs = [...all.matchAll(/(\d{1,2})\s*\+?\s*(?:to\s*\d{1,2}\s*)?(?:years?|yrs?)/gi)].map((m) => Number(m[1]));
  if (yrs.length > 0) {
    const n = Math.min(...yrs);
    return n >= 8 ? "lead" : n >= 5 ? "senior" : n >= 2 ? "mid" : "junior";
  }
  if (/\b(lead|principal|head of|director)\b/i.test(title)) return "lead";
  if (/\bsenior\b/i.test(title)) return "senior";
  if (/\b(junior|freshers?|entry[- ]level|graduate)\b/i.test(all)) return "junior";
  if (/\b(intern|internship)\b/i.test(all)) return "intern";
  return "mid";
}

export function parseJd(input: { title: string; location: string; text: string }): FitJob {
  const text = input.text.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[\s•\-*▪●◦·]+/, "").trim())
    .filter(Boolean);
  const remote = /\bremote\b/i.test(`${input.title} ${input.location}`) || (!input.location.trim() && /\b(fully|100%)?\s*remote\b/i.test(text));
  return {
    title: input.title.trim(),
    level: levelFromText(input.title, text),
    workMode: remote ? "remote" : "hybrid",
    location: input.location.trim(),
    skills: skillsInText(text),
    summary: lines.slice(0, 3).join(" "),
    responsibilities: lines,
    requirements: lines,
  };
}
