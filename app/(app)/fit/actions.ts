"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { fitReport, type FitReport } from "@/lib/fit";
import { getFitProfile } from "@/lib/fit-queries";
import { parseJd } from "@/lib/jd";

const schema = z.object({
  title: z.string().trim().min(2, "Enter the job title.").max(120, "Keep the title under 120 characters."),
  location: z.string().trim().max(80, "Keep the location under 80 characters.").default(""),
  text: z.string().trim().min(40, "Paste more of the job description (at least a few lines).").max(12000, "That is longer than we can read. Paste the main sections."),
});

export type CheckResult = { ok: true; report: FitReport; title: string; skillsFound: number } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Compare the signed-in candidate's profile with a pasted job description. Reads text only; nothing is saved or sent anywhere. */
export async function checkJobDescription(input: unknown): Promise<CheckResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }
  const profile = await getFitProfile(user.id);
  if (!profile) return { ok: false, message: "Complete your profile first." };
  const job = parseJd(parsed.data);
  return { ok: true, report: fitReport(profile, job), title: job.title, skillsFound: job.skills.length };
}
