import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Service-role client. It bypasses row-level security, so it is used ONLY by server code that must act without a
 * signed-in user: the ai_cache table, and the scheduled auto-apply run, which names each candidate explicitly and
 * applies that candidate's own saved limits. Never with user-supplied filters. SUPABASE_SERVICE_ROLE_KEY must stay server-side.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(supabaseEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
