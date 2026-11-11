// Rough years of experience from the free-text "period" on each experience entry ("Jul 2023 - Present").

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const RANGE = /([a-z]{3,9})\.?\s+(\d{4})\s*(?:-|–|—|to)\s*(?:([a-z]{3,9})\.?\s+(\d{4})|(present|current|now|ongoing))/i;

const monthIndex = (name: string, year: number) => {
  const m = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
  return m < 0 ? null : year * 12 + m;
};

/** Estimated whole-career years, counting overlapping roles once. null when no period could be read. */
export function estimateYears(periods: string[], now: Date = new Date()): number | null {
  const spans: [number, number][] = [];
  for (const p of periods) {
    const m = p.match(RANGE);
    if (!m) continue;
    const start = monthIndex(m[1], Number(m[2]));
    const end = m[5] ? now.getFullYear() * 12 + now.getMonth() : monthIndex(m[3] ?? "", Number(m[4]));
    if (start !== null && end !== null && end >= start && end - start < 600) spans.push([start, end + 1]);
  }
  if (spans.length === 0) return null;
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let reach = -Infinity;
  for (const [s, e] of spans) {
    if (s > reach) {
      total += e - s;
      reach = e;
    } else if (e > reach) {
      total += e - reach;
      reach = e;
    }
  }
  return Math.round((total / 12) * 2) / 2;
}
