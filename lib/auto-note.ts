// A short, honest cover note for automatic applications. No AI: it names only skills that are on both the profile and
// the job, and the real match score. It claims nothing else (no years, no employers, no achievements).
import { skillKey } from "@/lib/skills";

export interface AutoNoteInput {
  firstName: string;
  title: string;
  company: string;
  profileSkills: string[];
  jobSkills: string[];
  score: number;
}

/** Skills on both sides, in the job's order and spelling, at most `max`. */
export function sharedSkills(profileSkills: string[], jobSkills: string[], max = 4): string[] {
  const have = new Set(profileSkills.map(skillKey));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of jobSkills) {
    const k = skillKey(s);
    if (have.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out.slice(0, max);
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function buildAutoNote(i: AutoNoteInput): string {
  const shared = sharedSkills(i.profileSkills, i.jobSkills);
  const first = i.firstName.trim() || "a candidate";
  const lines = [`Hello ${i.company} team,`, "", `I am applying for the ${i.title} role.`];
  if (shared.length > 0) lines.push(`My profile lists ${list(shared)}, which match what the role asks for (${i.score}% skill match on my profile).`);
  lines.push("My profile and resume are attached to this application. I would be glad to answer any questions.", "", `Regards,`, first);
  return lines.join("\n");
}
