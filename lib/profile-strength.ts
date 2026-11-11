// Profile strength: a 0-100 score and the single next action that would raise it the most.
// Pure and shared by the server (profile page) and the browser (live meter while editing).

export interface StrengthInput {
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  skills: string[];
  experienceCount: number;
  educationCount: number;
  hasResume: boolean;
}

export interface StrengthItem {
  key: "headline" | "summary" | "skills" | "experience" | "education" | "resume" | "phone" | "location";
  label: string;
  weight: number;
  /** points earned, 0..weight */
  earned: number;
  /** what to do next, written as an instruction */
  action: string;
  /** form section to scroll to */
  anchor: string;
}

const SKILLS_TARGET = 6;
const SUMMARY_TARGET = 120;

export function profileStrength(p: StrengthInput): { score: number; items: StrengthItem[]; next: StrengthItem | null } {
  const filled = (v?: string | null) => Boolean(v && v.trim());
  const skills = Math.min(p.skills.length, SKILLS_TARGET);
  const summaryLen = (p.summary ?? "").trim().length;

  const items: StrengthItem[] = [
    { key: "resume", label: "Resume", weight: 20, earned: p.hasResume ? 20 : 0, action: "Upload your resume as a PDF", anchor: "resume" },
    { key: "skills", label: "Skills", weight: 20, earned: Math.round((skills / SKILLS_TARGET) * 20), action: `Add ${SKILLS_TARGET - skills} more skill${SKILLS_TARGET - skills === 1 ? "" : "s"} so job matches are accurate`, anchor: "skills" },
    { key: "summary", label: "Summary", weight: 15, earned: Math.round(Math.min(summaryLen / SUMMARY_TARGET, 1) * 15), action: summaryLen === 0 ? "Write a short summary of what you do and want next" : `Extend your summary to about ${SUMMARY_TARGET} characters`, anchor: "basics" },
    { key: "experience", label: "Experience", weight: 15, earned: p.experienceCount > 0 ? 15 : 0, action: "Add a role or project, even an internship", anchor: "experience" },
    { key: "headline", label: "Headline", weight: 10, earned: filled(p.headline) ? 10 : 0, action: "Add a one-line headline recruiters see first", anchor: "basics" },
    { key: "education", label: "Education", weight: 10, earned: p.educationCount > 0 ? 10 : 0, action: "Add your education", anchor: "education" },
    { key: "phone", label: "Phone", weight: 5, earned: filled(p.phone) ? 5 : 0, action: "Add a phone number for recruiters", anchor: "basics" },
    { key: "location", label: "Location", weight: 5, earned: filled(p.location) ? 5 : 0, action: "Add your location", anchor: "basics" },
  ];

  const score = items.reduce((n, i) => n + i.earned, 0);
  // Biggest remaining gain first; on a tie, the order above (resume, skills, ...) decides.
  const next = items.filter((i) => i.earned < i.weight).sort((a, b) => b.weight - b.earned - (a.weight - a.earned))[0] ?? null;
  return { score, items, next };
}
