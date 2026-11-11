// Saved jobs and saved searches are private to their owner, enforced by row-level security.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
type Db = SupabaseClient<Database>;

async function candidate(): Promise<{ db: Db; id: string }> {
  const db = createClient<Database>(url, anon, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signUp({ email: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: "test-pass-1234" });
  if (error || !data.user || !data.session) throw new Error(`signUp failed: ${error?.message}`);
  return { db, id: data.user.id };
}

describe("saved jobs and searches", () => {
  let a: Awaited<ReturnType<typeof candidate>>;
  let b: Awaited<ReturnType<typeof candidate>>;
  let jobId: string;
  beforeAll(async () => {
    a = await candidate();
    b = await candidate();
    jobId = (await a.db.from("jobs").select("id").eq("slug", "fraud-analyst").single()).data!.id;
  });

  it("a candidate can save a job once; saving twice hits the unique key", async () => {
    expect((await a.db.from("saved_jobs").insert({ job_id: jobId })).error).toBeNull();
    expect((await a.db.from("saved_jobs").insert({ job_id: jobId })).error?.code).toBe("23505");
  });

  it("another candidate cannot see it or remove it", async () => {
    expect((await b.db.from("saved_jobs").select("*")).data).toEqual([]);
    await b.db.from("saved_jobs").delete().eq("job_id", jobId);
    expect((await a.db.from("saved_jobs").select("*")).data).toHaveLength(1);
  });

  it("cannot save a job on someone else's behalf", async () => {
    const r = await b.db.from("saved_jobs").insert({ job_id: jobId, candidate_id: a.id });
    expect(r.error).not.toBeNull();
  });

  it("saved searches are private and the name is bounded", async () => {
    expect((await a.db.from("saved_searches").insert({ name: "React", query: { qs: "q=react" } })).error).toBeNull();
    expect((await b.db.from("saved_searches").select("*")).data).toEqual([]);
    expect((await a.db.from("saved_searches").insert({ name: "x".repeat(81), query: { qs: "q=x" } })).error?.code).toBe("23514");
    expect((await a.db.from("saved_searches").insert({ name: "", query: { qs: "q=x" } })).error?.code).toBe("23514");
  });

  it("anonymous visitors see nothing", async () => {
    const anonDb = createClient<Database>(url, anon, { auth: { persistSession: false } });
    const r = await anonDb.from("saved_jobs").select("*");
    expect(r.data ?? []).toEqual([]);
  });
});
