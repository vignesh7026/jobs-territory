import type { ApplicationStatus } from "@/lib/applications/status";

// "Is this application going quiet?" Pure and rule-based: how long since anything changed, judged against how long
// each stage normally takes. No AI involved. The follow-up email draft is the only AI part.

export type Health = "on_track" | "follow_up" | "likely_ghosted";
export interface HealthResult {
  health: Health;
  /** whole days since the last status change */
  quietDays: number;
  /** one plain sentence for the page */
  detail: string;
}

/** [days after which to nudge, days after which it is probably dead] per stage. */
const THRESHOLDS: Record<Exclude<ApplicationStatus, "rejected">, [number, number]> = {
  applied: [10, 21],
  under_review: [14, 28],
  shortlisted: [10, 21],
  interview: [7, 14],
  offered: [4, 10],
};

export const HEALTH_LABEL: Record<Health, string> = { on_track: "On track", follow_up: "Follow up now", likely_ghosted: "Likely ghosted" };

/** null for a rejected application: there is nothing left to follow up. */
export function applicationHealth(status: ApplicationStatus, updatedAtIso: string, now: Date = new Date()): HealthResult | null {
  if (status === "rejected") return null;
  const quietDays = Math.max(0, Math.floor((now.getTime() - new Date(updatedAtIso).getTime()) / 864e5));
  const [nudge, ghost] = THRESHOLDS[status];

  if (quietDays > ghost) return { health: "likely_ghosted", quietDays, detail: `Nothing has changed in ${quietDays} days. Most employers who are interested reply sooner, so treat this as unlikely, though a short follow-up costs nothing.` };
  if (quietDays > nudge) return { health: "follow_up", quietDays, detail: `It has been ${quietDays} days since the last update. That is longer than usual at this stage, so a polite follow-up is reasonable now.` };
  return { health: "on_track", quietDays, detail: quietDays === 0 ? "Updated today. Nothing to do but wait." : `Last updated ${quietDays} ${quietDays === 1 ? "day" : "days"} ago, which is normal for this stage.` };
}
