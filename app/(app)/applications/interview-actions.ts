"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ applicationId: z.uuid(), at: z.iso.datetime().nullable() });
export type InterviewResult = { ok: true } | { ok: false; message: string };

/** Record (or clear, with null) when the interview is. The database checks ownership, status and a sane date range. */
export async function setInterviewTime(input: unknown): Promise<InterviewResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Pick a valid date and time." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_interview_time", { p_application: parsed.data.applicationId, p_at: parsed.data.at as string });
  if (error) {
    if (error.code === "P0002") return { ok: false, message: "That application was not found." };
    if (error.code === "22023") return { ok: false, message: "You can set an interview time once you are shortlisted." };
    if (error.code === "22008") return { ok: false, message: "Choose a date from yesterday up to six months ahead." };
    return { ok: false, message: "We could not save that. Try again." };
  }
  revalidatePath(`/applications/${parsed.data.applicationId}`);
  revalidatePath("/applications");
  return { ok: true };
}
