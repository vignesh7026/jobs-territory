"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { RELATIONSHIPS } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";

const addSchema = z.object({
  companyId: z.uuid(),
  jobSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
  fullName: z.string().trim().min(2, "Enter their name").max(120),
  relationship: z.enum(RELATIONSHIPS),
});

export type ConnectionResult = { ok: true } | { ok: false; message: string };

export async function addConnection(input: unknown): Promise<ConnectionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const p = parsed.data;

  const supabase = await createClient();
  const { count } = await supabase.from("connections").select("id", { count: "exact", head: true }).eq("candidate_id", user.id).eq("company_id", p.companyId);
  if ((count ?? 0) >= 10) return { ok: false, message: "That is plenty for one company. Remove someone first." };
  const { error } = await supabase.from("connections").insert({ company_id: p.companyId, full_name: p.fullName, relationship: p.relationship });
  if (error) return { ok: false, message: "We could not save that. Try again." };
  revalidatePath(`/jobs/${p.jobSlug}`);
  return { ok: true };
}

export async function removeConnection(id: string, jobSlug: string): Promise<ConnectionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown person." };
  const supabase = await createClient();
  const { error } = await supabase.from("connections").delete().eq("id", id).eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not remove that. Try again." };
  revalidatePath(`/jobs/${jobSlug}`);
  return { ok: true };
}
