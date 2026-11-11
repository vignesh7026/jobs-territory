// Small sliding-window limiter so one account cannot run up the model bill. In memory, per server instance:
// good enough to stop accidents and simple abuse; a shared store (Redis, Upstash) would be the next step at scale.
const hits = new Map<string, number[]>();

export function allow(userId: string, limit = 20, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

export const resetRateLimit = () => hits.clear();
