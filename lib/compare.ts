// Comparing jobs side by side: which ids, and which job wins each row.

export const MAX_COMPARE = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "a,b,c" -> up to three distinct, valid ids in the order given. Anything else is dropped. */
export function parseCompareIds(raw: string | string[] | undefined): string[] {
  const parts = (Array.isArray(raw) ? raw : [raw ?? ""]).flatMap((v) => v.split(",")).map((v) => v.trim().toLowerCase());
  return [...new Set(parts.filter((p) => UUID.test(p)))].slice(0, MAX_COMPARE);
}

/**
 * Indexes of the best value(s) in a row, or [] when there is nothing meaningful to highlight
 * (fewer than two values, or all equal). Ties are all returned.
 */
export function bestIndexes(values: (number | null)[], prefer: "high" | "low" = "high"): number[] {
  const real = values.map((v, i) => [v, i] as const).filter((x): x is readonly [number, number] => x[0] !== null);
  if (real.length < 2) return [];
  const target = prefer === "high" ? Math.max(...real.map((r) => r[0])) : Math.min(...real.map((r) => r[0]));
  if (real.every((r) => r[0] === target)) return [];
  return real.filter((r) => r[0] === target).map((r) => r[1]);
}
