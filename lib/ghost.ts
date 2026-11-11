// "Is this listing probably dead?" Plain rules on three signals: how long it has been up, how often it has been
// reposted, and whether the text says anything. It never says a job is fake, only what looks off and why, so the
// candidate can judge. No AI: the reasons are exact numbers from the listing.

export interface GhostInput {
  /** when the job first went up; null means "same as postedAt" */
  firstPostedAt: string | null;
  postedAt: string;
  repostCount: number;
  isVague: boolean;
}

export type GhostLevel = "none" | "check" | "likely";
export interface GhostResult {
  level: GhostLevel;
  /** plain sentences, strongest first */
  reasons: string[];
}

const AGED_DAYS = 45;
const VERY_AGED_DAYS = 90;

export function listingAgeDays(i: Pick<GhostInput, "firstPostedAt" | "postedAt">, now: Date = new Date()): number {
  const start = new Date(i.firstPostedAt ?? i.postedAt).getTime();
  return Math.max(0, Math.floor((now.getTime() - start) / 864e5));
}

export function ghostCheck(i: GhostInput, now: Date = new Date()): GhostResult {
  const reasons: string[] = [];
  let score = 0;

  const age = listingAgeDays(i, now);
  if (age >= VERY_AGED_DAYS) {
    reasons.push(`First posted ${age} days ago and still open.`);
    score += 2;
  } else if (age >= AGED_DAYS) {
    reasons.push(`First posted ${age} days ago.`);
    score += 1;
  }

  if (i.repostCount >= 3) {
    reasons.push(`Reposted ${i.repostCount} times, which often means the role is not being filled.`);
    score += 2;
  } else if (i.repostCount >= 1) {
    reasons.push(`Reposted ${i.repostCount === 1 ? "once" : `${i.repostCount} times`}.`);
    score += 1;
  }

  if (i.isVague) {
    reasons.push("The description is thin: little about the work, and few or no listed skills.");
    score += 1;
  }

  return { level: score >= 3 ? "likely" : score >= 1 ? "check" : "none", reasons };
}

export const GHOST_LABEL: Record<Exclude<GhostLevel, "none">, string> = { check: "Check before applying", likely: "May be a stale listing" };
