// Referral finder, pure parts: matching alumni by college and drafting a first message. Nothing here sends anything.

export interface Employee {
  id: string;
  fullName: string;
  title: string;
  college: string;
  gradYear: number | null;
}

// Words that do not distinguish one college from another.
const NOISE = new Set(["college", "of", "the", "institute", "university", "engineering", "and", "technology", "tech", "school", "for", "in", "at"]);

/** "PSG College of Technology" and "PSG Tech" both become "psg". Names with no distinguishing word become "". */
export function collegeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w))
    .join(" ");
}

/** Employees who went to one of the candidate's colleges, most recent graduates first. */
export function matchAlumni(candidateSchools: string[], employees: Employee[]): Employee[] {
  const mine = new Set(candidateSchools.map(collegeKey).filter(Boolean));
  if (mine.size === 0) return [];
  return employees.filter((e) => mine.has(collegeKey(e.college))).sort((a, b) => (b.gradYear ?? 0) - (a.gradYear ?? 0));
}

export const RELATIONSHIPS = ["colleague", "friend", "classmate", "former manager", "family"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

const given = (name: string) => name.replace(/^(dr|prof)\.?\s+/i, "").split(/\s+/)[0] || name;

export interface ReferralDraftInput {
  candidateFirstName: string;
  contactName: string;
  company: string;
  jobTitle: string;
  /** the shared college for alumni, or a relationship for someone you know */
  basis: { kind: "alumni"; college: string } | { kind: "know"; relationship: Relationship };
  sharedSkills: string[];
}

export function draftReferralMessage(i: ReferralDraftInput): string {
  const hello = `Hello ${given(i.contactName)},`;
  const tie = i.basis.kind === "alumni" ? `I am ${i.candidateFirstName}, and I also studied at ${i.basis.college}.` : `I am ${i.candidateFirstName}; we know each other as ${i.basis.relationship === "former manager" ? "former manager and report" : i.basis.relationship === "family" ? "family" : i.basis.relationship + "s"}.`;
  const why = i.sharedSkills.length > 0 ? ` My background in ${i.sharedSkills.slice(0, 3).join(", ")} matches what the listing asks for.` : "";
  const ask = `I am applying for the ${i.jobTitle} role at ${i.company}.${why} Would you be open to a short chat about the team? And if, after that, you think I am a fit, I would be grateful for a referral. If it is not a good time, no problem at all.`;
  return [hello, "", tie, "", ask, "", "Thank you,", i.candidateFirstName].join("\n");
}
