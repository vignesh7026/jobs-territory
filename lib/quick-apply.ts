// "Quick apply": jobs you can apply to in one tap with your current profile. Pure rules, so they are tested.
// A job qualifies when it is open, you have not applied, and your profile already covers most of what it asks for.
// The application goes in without a cover note; you can undo it for ten minutes like any other.

export const QUICK_MIN_MATCH = 60;
export const QUICK_MIN_SKILLS = 3;

export interface QuickProfile {
  skills: string[];
  hasResume: boolean;
  hasExperience: boolean;
}

/** A profile is ready when a recruiter would have something to read: some skills, and a resume or work history. */
export function quickApplyReadiness(p: QuickProfile): { ready: true } | { ready: false; reason: string } {
  if (p.skills.length < QUICK_MIN_SKILLS) return { ready: false, reason: `Add at least ${QUICK_MIN_SKILLS} skills to your profile first.` };
  if (!p.hasResume && !p.hasExperience) return { ready: false, reason: "Upload a resume or add a role to your profile first." };
  return { ready: true };
}

export function isQuickApplyJob(j: { score: number; applied: boolean; closed: boolean }): boolean {
  return !j.closed && !j.applied && j.score >= QUICK_MIN_MATCH;
}
