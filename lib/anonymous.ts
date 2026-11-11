// Anonymous (blind) applications, the page-side mirror of the database rule in migration 1000.
// The database is the enforcement; this is so the page can say the right thing and use the right view.

import type { ApplicationStatus } from "@/lib/applications/status";

const REVEALING: ApplicationStatus[] = ["shortlisted", "interview", "offered"];

/** Same rule as is_blind_candidate: anonymous, and never shortlisted (even if later rejected). */
export function isBlind(a: { anonymous: boolean; statuses: string[] }): boolean {
  return a.anonymous && !a.statuses.some((s) => REVEALING.includes(s as ApplicationStatus));
}

/** A stable label for a blind application, so reviewers can refer to it without a name. */
export function pseudonym(applicationId: string): string {
  return `Candidate ${applicationId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Whole years of experience from role periods like "Jul 2023 - Present", for the stripped view. */
export function yearsOfExperience(periods: string[], now: Date = new Date()): number {
  let months = 0;
  for (const p of periods) {
    const years = [...p.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
    if (years.length === 0) continue;
    const start = years[0];
    const end = /present|current|now/i.test(p) ? now.getFullYear() : (years[1] ?? start + 1);
    months += Math.max(0, end - start) * 12;
  }
  return Math.round(months / 12);
}
