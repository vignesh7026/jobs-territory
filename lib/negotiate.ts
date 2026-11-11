// Salary negotiation helpers. Pure and tested. The range comes from other listings on this site with the same level
// and job type, so it is a signal about this site's market, not a claim about the whole market; the UI says so.

export interface MarketRange {
  /** 25th, 50th and 75th percentile of the listings' midpoints, in INR (per year, or per month for internships) */
  low: number;
  mid: number;
  high: number;
  sample: number;
}

const percentile = (sorted: number[], p: number) => {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

export const MIN_MARKET_SAMPLE = 3;

/** null when there are too few comparable listings to say anything honest. */
export function marketRange(midpointsInr: number[]): MarketRange | null {
  const xs = midpointsInr.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (xs.length < MIN_MARKET_SAMPLE) return null;
  return { low: percentile(xs, 0.25), mid: percentile(xs, 0.5), high: percentile(xs, 0.75), sample: xs.length };
}

/** Midpoint of a listing's range in INR, from the stored max-in-INR and the original min/max ratio. */
export function midpointInr(min: number | null, max: number | null, maxInr: number | null): number | null {
  if (max == null || maxInr == null || max <= 0) return null;
  const lo = min ?? max;
  return maxInr * ((lo + max) / (2 * max));
}

/** "₹14.2 LPA" for annual figures, "₹22,500 / month" for monthly stipends. */
export function formatInr(n: number, monthly: boolean): string {
  if (monthly) return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n / 12 / 500) * 500)} / month`;
  return `₹${Math.round(n / 10_000) / 10} LPA`;
}

export function describeRange(r: MarketRange, monthly: boolean): string {
  return `${formatInr(r.low, monthly)} to ${formatInr(r.high, monthly)}, middle ${formatInr(r.mid, monthly)}`;
}

export interface NegotiationInput {
  firstName: string;
  jobTitle: string;
  company: string;
  /** what the candidate typed, e.g. "14 LPA"; empty if they did not */
  offer: string;
  /** "12 to 16 LPA, middle 14 LPA" or null */
  range: string | null;
}

export interface NegotiationDraft {
  subject: string;
  body: string;
}

/** The plain draft: thanks, interest, one respectful question about flexibility, an offer to talk. No numbers invented. */
export function plainNegotiation(i: NegotiationInput): NegotiationDraft {
  const offerLine = i.offer ? ` The offer of ${i.offer} is appreciated.` : "";
  const ask = i.range
    ? `Before I accept, I would like to ask whether there is flexibility on the compensation. For comparable roles I have seen listings in the range of ${i.range}, and I would be glad to discuss where this role sits within it.`
    : "Before I accept, I would like to ask whether there is flexibility on the compensation, and I would be glad to discuss how the role is leveled.";
  return {
    subject: `${i.jobTitle} offer: thank you and one question`,
    body: `Hello,\n\nThank you for offering me the ${i.jobTitle} role at ${i.company}.${offerLine} I am excited about the work and the team.\n\n${ask}\n\nIf it is easier to talk it through, I am available for a short call at your convenience.\n\nThank you again,\n${i.firstName}`,
  };
}
