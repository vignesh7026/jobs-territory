"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/** Supabase client for Client Components (anon key only; row-level security protects the data). */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
