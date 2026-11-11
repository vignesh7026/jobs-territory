"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { STATUSES } from "@/lib/applications/status";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  applicationId: z.uuid(),
  status: z.enum(STATUSES),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
});

export type ChangeStatusResult = { ok: true } | { ok: false; message: string };

/**
 * Admin-only. The database function does the real work in one transaction: checks the role, checks the move is
 * allowed, updates the status and writes the timeline event. This action only validates and reports.
 */
export async function changeApplicationStatus(input: { applicationId: string; status: string; note?: string }): Promise<ChangeStatusResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (user.role !== "admin") return { ok: false, message: "Only admins can change application status." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That change is not valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_application_status", { p_application_id: parsed.data.applicationId, p_status: parsed.data.status, p_note: parsed.data.note ?? undefined });
  if (error) {
    if (error.code === "22023") return { ok: false, message: "That move is not allowed from the current status. The page was out of date; it has been refreshed." };
    if (error.code === "42501") return { ok: false, message: "Only admins can change application status." };
    if (error.code === "P0002") return { ok: false, message: "That application no longer exists." };
    return { ok: false, message: "We could not update the status. Try again." };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/applications/${parsed.data.applicationId}`);
  revalidatePath("/applications");
  return { ok: true };
}
