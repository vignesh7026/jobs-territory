"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasActiveFilters, parseFilters, toSearchParams } from "@/lib/jobs/filters";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const MAX_SAVED_SEARCHES = 20;
const uuid = z.uuid();

/** Save or unsave a job. Idempotent: saving twice is fine, unsaving something not saved is fine. */
export async function setJobSaved(jobId: string, saved: boolean): Promise<ActionResult<{ saved: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to save jobs." };
  if (!uuid.safeParse(jobId).success) return { ok: false, message: "That job link is not valid." };

  const supabase = await createClient();
  if (saved) {
    const { error } = await supabase.from("saved_jobs").insert({ job_id: jobId });
    if (error && error.code !== "23505") return { ok: false, message: error.code === "23503" ? "That job no longer exists." : "We could not save that job. Try again." };
  } else {
    const { error } = await supabase.from("saved_jobs").delete().eq("job_id", jobId).eq("candidate_id", user.id);
    if (error) return { ok: false, message: "We could not remove that job. Try again." };
  }
  revalidatePath("/saved");
  return { ok: true, saved };
}

const saveSearchSchema = z.object({
  name: z.string().trim().min(1, "Give the search a name.").max(80, "Keep the name under 80 characters."),
  query: z.string().max(600),
});

/** Save the current search. The query is normalised through the same parser the jobs page uses. */
export async function saveSearch(input: { name: string; query: string }): Promise<ActionResult<{ id: string; duplicate: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to save searches." };
  const parsed = saveSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the name." };

  const filters = parseFilters(new URLSearchParams(parsed.data.query));
  if (!hasActiveFilters(filters)) return { ok: false, message: "Add a keyword or a filter first. There is nothing to save yet." };
  filters.page = 1;
  const qs = toSearchParams(filters).toString();

  const supabase = await createClient();
  const { data: existing, error: listError } = await supabase.from("saved_searches").select("id, query");
  if (listError) return { ok: false, message: "We could not save that search. Try again." };
  const dup = (existing ?? []).find((r) => (r.query as { qs?: string } | null)?.qs === qs);
  if (dup) return { ok: true, id: dup.id, duplicate: true };
  if ((existing ?? []).length >= MAX_SAVED_SEARCHES) return { ok: false, message: `You can keep up to ${MAX_SAVED_SEARCHES} saved searches. Delete one first.` };

  const { data, error } = await supabase.from("saved_searches").insert({ name: parsed.data.name, query: { qs } }).select("id").single();
  if (error || !data) return { ok: false, message: "We could not save that search. Try again." };
  revalidatePath("/saved");
  return { ok: true, id: data.id, duplicate: false };
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  if (!uuid.safeParse(id).success) return { ok: false, message: "That search was not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not delete that search. Try again." };
  revalidatePath("/saved");
  return { ok: true };
}
