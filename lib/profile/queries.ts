import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MatchProfile } from "@/lib/match";

/** The parts of the signed-in candidate's profile that feed match scores. Returns null for signed-out visitors. */
export async function getMatchProfile(userId: string | null): Promise<(MatchProfile & { version: number }) | null> {
  if (!userId) return null;
  return matchProfileFrom(await createClient(), userId);
}

/** Same, with a client the caller chose (the scheduled run uses the service client and names each candidate). */
export async function matchProfileFrom(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<(MatchProfile & { version: number }) | null> {
  const { data } = await supabase.from("profiles").select("skills, location, experience, resume_path, profile_version").eq("id", userId).maybeSingle();
  if (!data) return null;
  const experience = Array.isArray(data.experience) ? (data.experience as { period?: unknown; title?: unknown; company?: unknown }[]) : [];
  return {
    skills: data.skills,
    location: data.location,
    experiencePeriods: experience.map((e) => (typeof e?.period === "string" ? e.period : "")),
    hasExperience: experience.some((e) => e?.title || e?.company),
    hasResume: Boolean(data.resume_path),
    version: data.profile_version,
  };
}
