import { createHash } from "node:crypto";
import type { ZodType } from "zod";

// The AI pipeline, free of Next.js and Supabase so it can be tested with a fake model and a fake cache.
// Contract: it NEVER throws. Whatever goes wrong, the caller gets the plain (non-AI) result and a reason.

export interface ModelCall {
  (req: { system: string; user: string; maxTokens: number }): Promise<string>;
}
export interface AiCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, row: { kind: string; jobId?: string; profileVersion?: number; payload: unknown }): Promise<void>;
}
export interface AiDeps {
  call: ModelCall;
  cache: AiCache;
  /** injectable clock, for the circuit breaker */
  now?: () => number;
}

export interface AiSpec<T> {
  kind: string;
  jobId?: string;
  /** results that depend on the profile are cached per profile version */
  profileVersion?: number;
  /** anything else that changes the answer (application id and status, for example) */
  inputKey?: string;
  schema: ZodType<T>;
  system: string;
  user: string;
  maxTokens: number;
  /** the plain result, used when the model is unavailable or returns something unusable */
  fallback: T;
}

export type AiSource = "ai" | "cache" | "fallback";
export interface AiResult<T> {
  data: T;
  source: AiSource;
  /** why the fallback was used; for logs and tests, never shown raw to users */
  reason?: string;
}

export const cacheKey = (s: Pick<AiSpec<unknown>, "kind" | "jobId" | "profileVersion" | "inputKey">) =>
  createHash("sha256").update([s.kind, s.jobId ?? "", s.profileVersion ?? "", s.inputKey ?? ""].join("|")).digest("hex");

/** Pulls a JSON object out of model text, tolerating code fences and a sentence before or after. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(body.slice(start, end + 1));
}

// After a failure that cannot fix itself (no key, no credit, rejected key) stop calling for a while.
// Per server instance; in a serverless deployment each instance learns on its own.
const BREAKER_MS = 5 * 60 * 1000;
let breakerUntil = 0;
export const resetBreaker = () => {
  breakerUntil = 0;
};

export async function runAi<T>(deps: AiDeps, spec: AiSpec<T>): Promise<AiResult<T>> {
  const now = deps.now ?? Date.now;
  const fallback = (reason: string): AiResult<T> => ({ data: spec.fallback, source: "fallback", reason });
  const key = cacheKey(spec);

  try {
    const hit = await deps.cache.get(key);
    if (hit !== null && hit !== undefined) {
      const parsed = spec.schema.safeParse(hit);
      if (parsed.success) return { data: parsed.data, source: "cache" };
    }
  } catch {
    /* a broken cache must not break the feature */
  }

  if (now() < breakerUntil) return fallback("model temporarily disabled after a permanent error");

  let text: string;
  try {
    text = await deps.call({ system: spec.system, user: spec.user, maxTokens: spec.maxTokens });
  } catch (e) {
    const permanent = typeof e === "object" && e !== null && "permanent" in e && (e as { permanent: boolean }).permanent;
    if (permanent) breakerUntil = now() + BREAKER_MS;
    return fallback(e instanceof Error ? e.message : "model call failed");
  }

  let parsed;
  try {
    parsed = spec.schema.safeParse(extractJson(text));
  } catch {
    return fallback("the reply was not valid JSON");
  }
  if (!parsed.success) return fallback("the reply did not match the expected shape");

  try {
    await deps.cache.set(key, { kind: spec.kind, jobId: spec.jobId, profileVersion: spec.profileVersion, payload: parsed.data });
  } catch {
    /* caching is an optimisation */
  }
  return { data: parsed.data, source: "ai" };
}
