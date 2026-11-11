// Integration tests for applying: duplicates, closed jobs, validation, undo. Real database, real RLS.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { applyToJob, undoApplication } from "@/lib/applications/apply";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
type Db = SupabaseClient<Database>;

const fresh = () => createClient<Database>(url, anon, { auth: { persistSession: false } });
async function newCandidate(): Promise<Db> {
  const db = fresh();
  const { data, error } = await db.auth.signUp({ email: `apply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: "test-pass-1234" });
  if (error || !data.session) throw new Error(`signUp failed: ${error?.message}`);
  return db;
}
async function jobId(slug: string): Promise<string> {
  const { data } = await fresh().from("jobs").select("id").eq("slug", slug).single();
  return data!.id;
}

describe("applyToJob", () => {
  let candidate: Db;
  let openJob: string;
  beforeAll(async () => {
    candidate = await newCandidate();
    openJob = await jobId("fraud-analyst");
  });

  it("creates an application with status 'applied' and a first timeline event", async () => {
    const r = await applyToJob(candidate, { jobId: openJob, coverNote: "  I would like to join.  " });
    expect(r.status).toBe(201);
    if (r.status !== 201) return;
    expect(r.application.status).toBe("applied");

    const { data: app } = await candidate.from("applications").select("cover_note").eq("id", r.application.id).single();
    expect(app?.cover_note).toBe("I would like to join."); // trimmed
    const { data: events } = await candidate.from("application_events").select("status, note").eq("application_id", r.application.id);
    expect(events).toEqual([{ status: "applied", note: "Application submitted" }]);
  });

  it("returns 409 'Already applied' for a duplicate and keeps exactly one application", async () => {
    const r = await applyToJob(candidate, { jobId: openJob });
    expect(r).toEqual({ status: 409, error: "Already applied" });
    const { count } = await candidate.from("applications").select("*", { count: "exact", head: true }).eq("job_id", openJob);
    expect(count).toBe(1);
  });

  it("two simultaneous applications to the same job: one wins, one gets 409", async () => {
    const racer = await newCandidate();
    const job = await jobId("analytics-engineer");
    const results = await Promise.all([applyToJob(racer, { jobId: job }), applyToJob(racer, { jobId: job })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("returns 410 for a closed job", async () => {
    const r = await applyToJob(candidate, { jobId: await jobId("catalogue-operations-executive") });
    expect(r.status).toBe(410);
  });

  it("returns 404 for a job that does not exist, 400 for a malformed id", async () => {
    expect((await applyToJob(candidate, { jobId: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
    const bad = await applyToJob(candidate, { jobId: "not-a-uuid" });
    expect(bad.status).toBe(400);
  });

  it("returns 400 with a plain message for an over-long cover note", async () => {
    const job = await jobId("security-analyst-soc");
    const r = await applyToJob(candidate, { jobId: job, coverNote: "x".repeat(3001) });
    expect(r.status).toBe(400);
    if (r.status === 400) expect(r.fieldErrors?.coverNote).toMatch(/3000/);
  });

  it("returns 401 when signed out", async () => {
    expect((await applyToJob(fresh(), { jobId: openJob })).status).toBe(401);
  });
});

describe("undoApplication", () => {
  it("removes a fresh application, so the candidate can apply again", async () => {
    const db = await newCandidate();
    const job = await jobId("qa-automation-engineer");
    const applied = await applyToJob(db, { jobId: job });
    if (applied.status !== 201) throw new Error("setup failed");

    expect(await undoApplication(db, applied.application.id)).toEqual({ status: 200 });
    const { count } = await db.from("applications").select("*", { count: "exact", head: true });
    expect(count).toBe(0);
    expect((await applyToJob(db, { jobId: job })).status).toBe(201);
  });

  it("is refused for someone else's application (404, not 403, so ids are not revealed)", async () => {
    const owner = await newCandidate();
    const other = await newCandidate();
    const applied = await applyToJob(owner, { jobId: await jobId("fraud-analyst") });
    if (applied.status !== 201) throw new Error("setup failed");
    expect((await undoApplication(other, applied.application.id)).status).toBe(404);
    const { count } = await owner.from("applications").select("*", { count: "exact", head: true });
    expect(count).toBe(1);
  });

  it("is refused once an admin has moved the application on", async () => {
    const candidate = await newCandidate();
    const applied = await applyToJob(candidate, { jobId: await jobId("data-analyst-credit-risk") });
    if (applied.status !== 201) throw new Error("setup failed");

    const admin = fresh();
    await admin.auth.signInWithPassword({ email: "admin@jobsterritory.example", password: "Demo-Admin-26" });
    const moved = await admin.rpc("admin_set_application_status", { p_application_id: applied.application.id, p_status: "under_review" });
    expect(moved.error).toBeNull();

    const r = await undoApplication(candidate, applied.application.id);
    expect(r.status).toBe(409);
  });

  it("returns 404 for a malformed id and 401 when signed out", async () => {
    expect((await undoApplication(fresh(), "nope")).status).toBe(404);
    expect((await undoApplication(fresh(), "00000000-0000-4000-8000-000000000000")).status).toBe(401);
  });
});

describe("admin status changes", () => {
  it("a status change writes an event with the actor, and illegal jumps are rejected", async () => {
    const candidate = await newCandidate();
    const applied = await applyToJob(candidate, { jobId: await jobId("customer-success-associate") });
    if (applied.status !== 201) throw new Error("setup failed");

    const admin = fresh();
    await admin.auth.signInWithPassword({ email: "admin@jobsterritory.example", password: "Demo-Admin-26" });
    const ok = await admin.rpc("admin_set_application_status", { p_application_id: applied.application.id, p_status: "under_review", p_note: "Looks promising" });
    expect(ok.error).toBeNull();
    expect(ok.data?.status).toBe("under_review");

    const { data: events } = await candidate.from("application_events").select("status, note, actor_id").eq("application_id", applied.application.id).order("id");
    expect(events?.map((e) => e.status)).toEqual(["applied", "under_review"]);
    expect(events?.[1].note).toBe("Looks promising");
    expect(events?.[1].actor_id).toBeTruthy();

    const skip = await admin.rpc("admin_set_application_status", { p_application_id: applied.application.id, p_status: "offered" });
    expect(skip.error?.code).toBe("22023");

    const asCandidate = await candidate.rpc("admin_set_application_status", { p_application_id: applied.application.id, p_status: "shortlisted" });
    expect(asCandidate.error?.code).toBe("42501");
  });
});
