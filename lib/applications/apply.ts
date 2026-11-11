import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { pathErrors } from "@/lib/validation/shared";

// Framework-free on purpose: the route handlers call these, and so do the integration tests, against a real database.

export const applySchema = z.object({
  jobId: z.uuid("That job link is not valid."),
  coverNote: z
    .string()
    .trim()
    .max(3000, "Keep the cover note under 3000 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
  /** hide name, college, employers and resume from reviewers until shortlisted */
  anonymous: z.boolean().optional().default(false),
});
export type ApplyInput = z.input<typeof applySchema>;

export type ApplyResult =
  | { status: 201; application: { id: string; status: string; createdAt: string } }
  | { status: 400; error: string; fieldErrors?: Record<string, string> }
  | { status: 401 | 404 | 409 | 410 | 500; error: string };

type Db = SupabaseClient<Database>;

/**
 * Apply to a job as the signed-in candidate.
 *   400 invalid input, 401 not signed in, 404 no such job, 409 already applied, 410 job closed, 500 anything else.
 * Row-level security and the unique (candidate, job) constraint are the real guards; the checks here give clear answers.
 */
export async function applyToJob(db: Db, input: unknown): Promise<ApplyResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { status: 400, error: "Check the highlighted fields.", fieldErrors: pathErrors(parsed.error) };

  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { status: 401, error: "Sign in to apply." };

  const { data: job, error: jobError } = await db.from("jobs").select("id, closes_at").eq("id", parsed.data.jobId).maybeSingle();
  if (jobError) return { status: 500, error: "We could not check that job. Try again." };
  if (!job) return { status: 404, error: "That job no longer exists." };
  if (job.closes_at && new Date(job.closes_at) <= new Date()) return { status: 410, error: "This job is no longer accepting applications." };

  const { data, error } = await db.from("applications").insert({ job_id: job.id, cover_note: parsed.data.coverNote, anonymous: parsed.data.anonymous }).select("id, status, created_at").single();
  if (error) {
    if (error.code === "23505") return { status: 409, error: "Already applied" };
    if (error.code === "42501") return { status: 410, error: "This job is no longer accepting applications." }; // closed between the check and the insert
    return { status: 500, error: "We could not send your application. Try again." };
  }
  return { status: 201, application: { id: data.id, status: data.status, createdAt: data.created_at } };
}

export type UndoResult = { status: 200 } | { status: 401 | 404 | 409 | 500; error: string };

/** Take back an application. Only possible while it is still 'applied' and under ten minutes old. */
export async function undoApplication(db: Db, applicationId: string): Promise<UndoResult> {
  if (!z.uuid().safeParse(applicationId).success) return { status: 404, error: "Application not found." };
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { status: 401, error: "Sign in first." };

  const { error } = await db.rpc("undo_application", { p_application_id: applicationId });
  if (!error) return { status: 200 };
  if (error.code === "P0002") return { status: 404, error: "Application not found." };
  if (error.code === "22023") return { status: 409, error: "This application can no longer be undone. It has already been reviewed or was sent more than 10 minutes ago." };
  return { status: 500, error: "We could not undo that. Try again." };
}
