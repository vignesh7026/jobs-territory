// "How are my applications going?" from the candidate's own history only. Pure and tested. It never invents a
// benchmark: every number is a count or a median of their own applications, and small samples are labelled as such.
import type { ApplicationStatus } from "@/lib/applications/status";

export interface OutcomeInput {
  status: ApplicationStatus;
  createdAt: string;
  /** when the first event after "applied" happened (review, shortlist, rejection...), or null if nobody has acted */
  firstResponseAt: string | null;
  autoApplied: boolean;
}

export interface Segment {
  label: string;
  total: number;
  responded: number;
  /** whole percent */
  rate: number;
}

export interface Outcomes {
  total: number;
  responded: number;
  rate: number;
  /** median whole days from applying to the first response, null with fewer than 2 responses */
  medianDays: number | null;
  /** applications still waiting with no response at all */
  waiting: number;
  /** of those, how many have waited longer than twice the median (or 14 days when the median is unknown) */
  slow: number;
  interviews: number;
  offers: number;
  /** only present when both groups have at least 3 applications, so the comparison means something */
  autoVsManual: [Segment, Segment] | null;
  /** fewer than 5 applications: say the numbers are a rough start */
  smallSample: boolean;
}

export const MIN_FOR_CARD = 3;
const DAY = 864e5;

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function computeOutcomes(apps: OutcomeInput[], now: Date = new Date()): Outcomes | null {
  if (apps.length < MIN_FOR_CARD) return null;
  const responded = apps.filter((a) => a.firstResponseAt !== null || a.status !== "applied");
  const days = apps.flatMap((a) => (a.firstResponseAt ? [Math.max(0, Math.round((new Date(a.firstResponseAt).getTime() - new Date(a.createdAt).getTime()) / DAY))] : []));
  const medianDays = days.length >= 2 ? median(days) : null;

  const waitingApps = apps.filter((a) => !responded.includes(a));
  const limit = medianDays !== null ? Math.max(medianDays * 2, 3) : 14;
  const slow = waitingApps.filter((a) => (now.getTime() - new Date(a.createdAt).getTime()) / DAY > limit).length;

  const seg = (label: string, group: OutcomeInput[]): Segment => {
    const r = group.filter((a) => responded.includes(a)).length;
    return { label, total: group.length, responded: r, rate: pct(r, group.length) };
  };
  const auto = apps.filter((a) => a.autoApplied);
  const manual = apps.filter((a) => !a.autoApplied);

  return {
    total: apps.length,
    responded: responded.length,
    rate: pct(responded.length, apps.length),
    medianDays,
    waiting: waitingApps.length,
    slow,
    interviews: apps.filter((a) => a.status === "interview" || a.status === "offered").length,
    offers: apps.filter((a) => a.status === "offered").length,
    autoVsManual: auto.length >= 3 && manual.length >= 3 ? [seg("Applied by hand", manual), seg("Applied automatically", auto)] : null,
    smallSample: apps.length < 5,
  };
}
