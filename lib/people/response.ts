// How quickly a company replies, in words. Pure, so it is unit-tested.

export interface ResponseStats {
  applications: number;
  replied: number;
  medianHours: number | null;
}

/** One plain sentence for a response stat. Never claims more than the sample supports. */
export function describeResponse(s: ResponseStats): string {
  if (s.applications === 0) return "No applications to this company yet, so there is no reply history to show.";
  const n = `${s.applications} ${s.applications === 1 ? "application" : "applications"}`;
  if (s.replied === 0 || s.medianHours === null) return `No reply recorded yet across ${n} on this site.`;
  const h = s.medianHours;
  const when = h < 36 ? "within about a day" : `in about ${Math.round(h / 24)} days`;
  return `Typically replies ${when}, from ${s.replied} of ${n} on this site${s.applications < 5 ? ". Small sample, so treat it as a hint" : ""}.`;
}
