"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  companyId: z.uuid(),
  verified: z.boolean(),
  note: z.string().trim().max(300, "Keep the note under 300 characters.").optional(),
});

export type VerifyResult = { ok: true } | { ok: false; message: string };

/** Admin-only. The database function re-checks the role and requires a note when verifying. */
export async function setCompanyVerified(input: unknown): Promise<VerifyResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (user.role !== "admin") return { ok: false, message: "Only admins can verify companies." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That change is not valid." };
  if (parsed.data.verified && (parsed.data.note ?? "").length < 5) return { ok: false, message: "Say how you checked it, in at least 5 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_company_verified", { p_company: parsed.data.companyId, p_verified: parsed.data.verified, p_note: parsed.data.note });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Only admins can verify companies." };
    if (error.code === "22023") return { ok: false, message: "Say how you checked it, in at least 5 characters." };
    if (error.code === "P0002") return { ok: false, message: "That company no longer exists." };
    return { ok: false, message: "We could not save that. Try again." };
  }
  revalidatePath("/admin/companies");
  revalidatePath("/jobs");
  return { ok: true };
}
