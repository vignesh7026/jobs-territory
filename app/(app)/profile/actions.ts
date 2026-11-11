"use server";

import { revalidatePath } from "next/cache";
import { allow } from "@/lib/ai/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { inferSkills, isGithubUsername, type SkillEvidence } from "@/lib/portfolio";
import { fetchPublicRepos } from "@/lib/portfolio-queries";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { pathErrors } from "@/lib/validation/shared";

export interface SaveProfileResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveProfile(input: ProfileInput): Promise<SaveProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again to save." };

  // The browser validates too, but this is the check that counts.
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some fields need attention.", fieldErrors: pathErrors(parsed.error) };
  const p = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: p.fullName, phone: p.phone, location: p.location, headline: p.headline, summary: p.summary, github_username: p.githubUsername || null, skills: p.skills, experience: p.experience, education: p.education })
    .eq("id", user.id);
  if (error) return { ok: false, message: "We could not save your profile. Your changes are still on this page. Try again." };

  revalidatePath("/profile");
  return { ok: true };
}

export type ScanResult = { ok: true; repoCount: number; skills: SkillEvidence[] } | { ok: false; message: string };

/** Reads a public GitHub account and suggests skills the profile does not list yet. Changes nothing by itself. */
export async function scanPortfolio(username: string, profileSkills: string[]): Promise<ScanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const name = username.trim();
  if (!isGithubUsername(name)) return { ok: false, message: "Enter just your GitHub username, like octocat." };
  if (!allow(`scan:${user.id}`, 6)) return { ok: false, message: "Too many scans. Wait a minute and try again." };

  const res = await fetchPublicRepos(name);
  if (!res.ok) return res;
  const own = res.repos.filter((r) => !r.fork && !r.archived);
  return { ok: true, repoCount: own.length, skills: inferSkills(res.repos, profileSkills.slice(0, 40)) };
}
