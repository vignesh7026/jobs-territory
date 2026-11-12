import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/** True only when the auth server answered and said the session is gone (4xx or "session missing"), never for network trouble. */
export function isDeadSession(error: { name?: string; status?: number }): boolean {
  if (error.name === "AuthSessionMissingError") return true;
  return typeof error.status === "number" && error.status >= 400 && error.status < 500;
}

/**
 * Refreshes the auth cookies on every request and reports whether a valid session exists.
 * This is only an optimistic check for redirects; data access is still enforced by row-level security,
 * and server code re-verifies with auth.getUser().
 */
export async function updateSession(request: NextRequest, opts: { verify?: boolean } = {}) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  if (opts.verify) {
    // Used where a wrong answer would trap someone (sign-in and register redirect signed-in users away). A token can
    // still be signature-valid after its session was deleted, for example when the database was reset; ask the auth
    // server, and if the session is gone, clear the dead cookies so the person can sign in again.
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return { response, isAuthed: true };
    if (error && isDeadSession(error)) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    // Any other error (auth server unreachable, restarting, timing out) says nothing about the session: keep the cookies
    // so the person is still signed in once the server is back.
    return { response, isAuthed: false };
  }

  const { data } = await supabase.auth.getClaims();
  return { response, isAuthed: Boolean(data?.claims?.sub) };
}
