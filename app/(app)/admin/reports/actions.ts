"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ reportId: z.uuid(), action: z.enum(["dismiss", "action"]) });
export type ResolveResult = { ok: true } | { ok: false; message: string };

/** Admin-only; the database function re-checks the role and applies the decision to every open report on that target. */
export async function resolveReport(input: unknown): Promise<ResolveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (user.role !== "admin") return { ok: false, message: "Only admins can review reports." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That decision is not valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report: parsed.data.reportId, p_action: parsed.data.action });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Only admins can review reports." };
    if (error.code === "P0002") return { ok: false, message: "That report no longer exists." };
    return { ok: false, message: "We could not save that decision. Try again." };
  }
  revalidatePath("/admin/reports");
  revalidatePath("/jobs");
  return { ok: true };
}
