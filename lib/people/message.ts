// A first message to a recruiter or founder. Plain template, no AI: it only rearranges what the candidate already
// has on their profile, so it cannot invent anything. Nothing is sent; the candidate copies or opens it in their mail app.

export interface DraftInput {
  contactName: string;
  contactKind: "founder" | "recruiter";
  company: string;
  jobTitle: string;
  candidateFirstName: string;
  /** profile skills that the job also lists, strongest first; may be empty */
  sharedSkills: string[];
  /** the candidate's headline, e.g. "Backend developer at a logistics start-up"; may be empty */
  headline: string;
}

const first = (name: string) => name.replace(/^(dr|prof)\.?\s+/i, "").split(/\s+/)[0] || name;

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function draftSubject(jobTitle: string): string {
  return `${jobTitle}: a short introduction`;
}

export function draftFirstMessage(i: DraftInput): string {
  const greeting = `Hello ${first(i.contactName)},`;
  const intro = i.headline ? `I am ${i.candidateFirstName}, ${lowerFirst(i.headline)}.` : `I am ${i.candidateFirstName}.`;
  const why =
    i.sharedSkills.length > 0
      ? `I am writing about the ${i.jobTitle} role at ${i.company}. My work with ${list(i.sharedSkills.slice(0, 3))} matches what the listing asks for.`
      : `I am writing about the ${i.jobTitle} role at ${i.company}.`;
  const ask =
    i.contactKind === "recruiter"
      ? "Is the role still open, and is there anything I should add to my application before it is reviewed?"
      : "I would value ten minutes of your view on what the team needs most from this hire.";
  return [greeting, "", intro, why, ask, "", "Thank you for your time.", i.candidateFirstName].join("\n");
}

function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}
