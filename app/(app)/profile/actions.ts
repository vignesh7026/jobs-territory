"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
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
    .update({ full_name: p.fullName, phone: p.phone, location: p.location, headline: p.headline, summary: p.summary, skills: p.skills, experience: p.experience, education: p.education })
    .eq("id", user.id);
  if (error) return { ok: false, message: "We could not save your profile. Your changes are still on this page. Try again." };

  revalidatePath("/profile");
  return { ok: true };
}
