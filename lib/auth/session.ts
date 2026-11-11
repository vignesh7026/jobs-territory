import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: "candidate" | "admin";
}

/** The signed-in user, verified with the auth server (not just the cookie). Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name || user.email || "Candidate",
    role: profile?.role ?? "candidate",
  };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Admin pages 404 for everyone else, so their existence is not revealed. Row-level security is the real gate. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
