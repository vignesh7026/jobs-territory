"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const shareSchema = z.object({
  companyId: z.uuid(),
  jobSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
  roleTitle: z.string().trim().min(2, "Name the role").max(120),
  rounds: z.number().int().min(1, "At least 1 round").max(8, "At most 8 rounds"),
  difficulty: z.number().int().min(1).max(5),
  outcome: z.enum(["offer", "rejected", "no_answer", "withdrew"]),
  experience: z.string().trim().min(30, "Write at least a couple of sentences (30 characters)").max(1500, "Keep it under 1500 characters"),
});

export type InsightResult = { ok: true } | { ok: false; message: string };

export async function shareInsight(input: unknown): Promise<InsightResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const p = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("interview_insights").insert({ company_id: p.companyId, role_title: p.roleTitle, rounds: p.rounds, difficulty: p.difficulty, outcome: p.outcome, experience: p.experience });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "You have already shared a note about this company. Remove it first to write another." };
    if (error.code === "42501") return { ok: false, message: "You can share a note once you have applied to a job at this company." };
    return { ok: false, message: "We could not save your note. Try again." };
  }
  revalidatePath(`/jobs/${p.jobSlug}`);
  return { ok: true };
}

export async function removeInsight(id: string, jobSlug: string): Promise<InsightResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown note." };
  const supabase = await createClient();
  const { error } = await supabase.from("interview_insights").delete().eq("id", id).eq("author_id", user.id);
  if (error) return { ok: false, message: "We could not remove that note. Try again." };
  revalidatePath(`/jobs/${jobSlug}`);
  return { ok: true };
}
