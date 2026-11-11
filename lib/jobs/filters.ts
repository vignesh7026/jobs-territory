// Job search filters <-> URL. Pure functions: the URL is the single source of truth, so every search is shareable.

export const JOB_TYPES = ["full_time", "part_time", "contract", "internship"] as const;
export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export const JOB_LEVELS = ["intern", "junior", "mid", "senior", "lead"] as const;
export const SORTS = ["relevance", "newest", "salary"] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type JobLevel = (typeof JOB_LEVELS)[number];
export type Sort = (typeof SORTS)[number];

export const TYPE_LABELS: Record<JobType, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" };
export const MODE_LABELS: Record<WorkMode, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
export const LEVEL_LABELS: Record<JobLevel, string> = { intern: "Intern", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead" };
export const SORT_LABELS: Record<Sort, string> = { relevance: "Best match for search", newest: "Newest", salary: "Highest salary" };

export interface JobFilters {
  q: string;
  location: string;
  types: JobType[];
  modes: WorkMode[];
  levels: JobLevel[];
  sort: Sort;
  page: number;
}

export const PAGE_SIZE = 12;
const MAX_PAGE = 500;

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function all(raw: Raw, key: string): string[] {
  if (raw instanceof URLSearchParams) return raw.getAll(key);
  const v = raw[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** Accepts "a,b" and repeated keys, drops unknown values, returns canonical order without duplicates. */
function pick<T extends string>(raw: Raw, key: string, allowed: readonly T[]): T[] {
  const given = new Set(all(raw, key).flatMap((v) => v.split(",")).map((v) => v.trim()));
  return allowed.filter((a) => given.has(a));
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export const defaultSort = (q: string): Sort => (q ? "relevance" : "newest");

export function parseFilters(raw: Raw): JobFilters {
  const q = clean(all(raw, "q")[0], 100);
  const location = clean(all(raw, "location")[0], 80);

  const sortRaw = all(raw, "sort")[0] as Sort | undefined;
  let sort: Sort = sortRaw && (SORTS as readonly string[]).includes(sortRaw) ? sortRaw : defaultSort(q);
  if (sort === "relevance" && !q) sort = "newest"; // nothing to rank without a keyword

  const pageRaw = Number.parseInt(all(raw, "page")[0] ?? "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), MAX_PAGE) : 1;

  return { q, location, types: pick(raw, "type", JOB_TYPES), modes: pick(raw, "mode", WORK_MODES), levels: pick(raw, "level", JOB_LEVELS), sort, page };
}

/** Canonical query string: defaults are omitted so equal searches always produce the same URL. */
export function toSearchParams(f: JobFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.location) p.set("location", f.location);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.modes.length) p.set("mode", f.modes.join(","));
  if (f.levels.length) p.set("level", f.levels.join(","));
  if (f.sort !== defaultSort(f.q)) p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

export function filtersHref(f: JobFilters, base = "/jobs"): string {
  const qs = toSearchParams(f).toString();
  return qs ? `${base}?${qs}` : base;
}

/** Change filters; going back to page 1 unless the change is itself a page change. */
export function withFilters(f: JobFilters, patch: Partial<JobFilters>): JobFilters {
  const next = { ...f, ...patch };
  if (!("page" in patch)) next.page = 1;
  if (next.sort === "relevance" && !next.q) next.sort = "newest";
  // keep a deliberate sort choice; only fall back to the default when the old sort was the default
  if (!("sort" in patch) && f.sort === defaultSort(f.q)) next.sort = defaultSort(next.q);
  return next;
}

export interface FilterChip {
  id: string;
  label: string;
  /** the filters with just this one removed */
  without: JobFilters;
}

export function activeChips(f: JobFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.q) chips.push({ id: "q", label: `"${f.q}"`, without: withFilters(f, { q: "" }) });
  if (f.location) chips.push({ id: "location", label: f.location, without: withFilters(f, { location: "" }) });
  for (const t of f.types) chips.push({ id: `type:${t}`, label: TYPE_LABELS[t], without: withFilters(f, { types: f.types.filter((x) => x !== t) }) });
  for (const m of f.modes) chips.push({ id: `mode:${m}`, label: MODE_LABELS[m], without: withFilters(f, { modes: f.modes.filter((x) => x !== m) }) });
  for (const l of f.levels) chips.push({ id: `level:${l}`, label: LEVEL_LABELS[l], without: withFilters(f, { levels: f.levels.filter((x) => x !== l) }) });
  return chips;
}

export const hasActiveFilters = (f: JobFilters) => activeChips(f).length > 0;
