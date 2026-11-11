import "server-only";
import { callAnthropic } from "@/lib/ai/anthropic";
import { runAi, type AiCache, type AiDeps, type AiResult, type AiSpec } from "@/lib/ai/run";
import { createAdminClient } from "@/lib/supabase/admin";

const TTL_DAYS = 30;

const supabaseCache: AiCache = {
  async get(key) {
    const { data } = await createAdminClient()
      .from("ai_cache")
      .select("payload, created_at")
      .eq("key", key)
      .maybeSingle();
    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_DAYS * 864e5) return null;
    return data.payload;
  },
  async set(key, row) {
    await createAdminClient()
      .from("ai_cache")
      .upsert({ key, kind: row.kind, job_id: row.jobId ?? null, profile_version: row.profileVersion ?? null, payload: row.payload as never, created_at: new Date().toISOString() });
  },
};

const deps: AiDeps = { call: callAnthropic, cache: supabaseCache };

/** Run an AI feature with the real model and the Supabase cache. Never throws; falls back to the plain result. */
export function ai<T>(spec: AiSpec<T>): Promise<AiResult<T>> {
  return runAi(deps, spec);
}
