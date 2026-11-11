// Display formatting for salaries and dates. Pure, so it is easy to test.

const compact = (n: number) => {
  const k = n / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, "")}k`;
};

const SYMBOL: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", SGD: "S$", CAD: "C$" };

/**
 * Salaries are shown in the job's own currency, in the style readers expect:
 *  - India, full-time: lakhs per annum ("₹14.2–20.8 LPA")
 *  - India, internships: a monthly stipend ("₹18,000–27,000 / month")
 *  - elsewhere: thousands ("$178k–$224k")
 */
export function formatSalary(min: number | null, max: number | null, currency: string, jobType?: string): string {
  if (min == null && max == null) return "Salary not listed";
  const lo = min ?? max!;
  const hi = max ?? min!;

  if (currency === "INR") {
    if (jobType === "internship") {
      const monthly = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n / 12 / 500) * 500);
      return lo === hi ? `₹${monthly(lo)} / month` : `₹${monthly(lo)}–${monthly(hi)} / month`;
    }
    const lakh = (n: number) => String(Math.round(n / 10_000) / 10);
    return lo === hi ? `₹${lakh(lo)} LPA` : `₹${lakh(lo)}–${lakh(hi)} LPA`;
  }
  const s = SYMBOL[currency] ?? `${currency} `;
  return lo === hi ? `${s}${compact(lo)}` : `${s}${compact(lo)}–${s}${compact(hi)}`;
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", "3 months ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} months ago` : "Over a year ago";
}

/** Whole days until a date; null when there is no deadline or it has passed. */
export function daysUntil(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / 864e5);
  return days >= 0 ? days : null;
}

/** "8 Nov 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** "8 Nov 2026, 4:12 pm" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return `${formatDate(iso)}, ${time}`;
}
