"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { REASON_KEYS } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  kind: z.enum(["job", "company", "insight"]),
  targetId: z.uuid(),
  reason: z.enum(REASON_KEYS),
  detail: z.string().trim().max(500, "Keep the details under 500 characters.").optional(),
});

export type ReportResult = { ok: true; message: string } | { ok: false; message: string };

export async function submitReport(input: unknown): Promise<ReportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to report something." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That report is not valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ kind: parsed.data.kind, target_id: parsed.data.targetId, reason: parsed.data.reason, detail: parsed.data.detail || null });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "You have already reported this." };
    if (error.code === "23503") return { ok: false, message: "That no longer exists." };
    if (error.code === "22023") return { ok: false, message: "You cannot report your own note." };
    return { ok: false, message: "We could not send your report. Try again." };
  }
  return { ok: true, message: "Thanks. An admin will review this." };
}
