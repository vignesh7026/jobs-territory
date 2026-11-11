"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { planToRows } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

const planSchema = z.object({
  target: z.string().trim().min(1).max(160),
  weeks: z
    .array(z.object({ week: z.number().int().min(1).max(12), skill: z.string().trim().min(1).max(60), tasks: z.array(z.string().trim().min(1).max(300)).min(1).max(4) }))
    .min(1)
    .max(12),
});

export type PlanResult = { ok: true } | { ok: false; message: string };

/** Replaces the candidate's plan. Links are attached here from the fixed table; whatever the client sent for them is ignored. */
export async function startPlan(input: unknown): Promise<PlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That plan could not be saved. Draft it again." };

  const rows = planToRows(parsed.data.weeks).map((r) => ({ ...r, target: parsed.data.target }));
  const supabase = await createClient();
  const del = await supabase.from("roadmap_items").delete().eq("candidate_id", user.id);
  if (del.error) return { ok: false, message: "We could not replace your current plan. Try again." };
  const ins = await supabase.from("roadmap_items").insert(rows);
  if (ins.error) return { ok: false, message: "We could not save the plan. Try again." };
  revalidatePath("/career");
  revalidatePath("/profile");
  return { ok: true };
}

export async function setItemDone(id: string, done: boolean): Promise<PlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown task." };
  const supabase = await createClient();
  const { error } = await supabase.from("roadmap_items").update({ done }).eq("id", id).eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not update that task. Try again." };
  revalidatePath("/career");
  revalidatePath("/profile");
  return { ok: true };
}

export async function clearPlan(): Promise<PlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("roadmap_items").delete().eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not remove the plan. Try again." };
  revalidatePath("/career");
  revalidatePath("/profile");
  return { ok: true };
}
