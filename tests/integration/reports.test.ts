// Reports: one per person per target, no self-reports, auto-hide at three reporters, admin decisions. Real database.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
type Db = SupabaseClient<Database>;
const fresh = () => createClient<Database>(url, anon, { auth: { persistSession: false } });
async function candidate(): Promise<Db> {
  const db = fresh();
  const { error } = await db.auth.signUp({ email: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: "test-pass-1234" });
  if (error) throw error;
  return db;
}
async function admin(): Promise<Db> {
  const db = fresh();
  await db.auth.signInWithPassword({ email: "admin@jobsterritory.example", password: "Demo-Admin-26" });
  return db;
}

describe("reports", () => {
  it("accepts a report, refuses a duplicate, and refuses a missing target", async () => {
    const c = await candidate();
    const { data: job } = await c.from("jobs").select("id").limit(1).single();
    const first = await c.from("reports").insert({ kind: "job", target_id: job!.id, reason: "misleading" });
    expect(first.error).toBeNull();
    const again = await c.from("reports").insert({ kind: "job", target_id: job!.id, reason: "other" });
    expect(again.error?.code).toBe("23505");
    const ghost = await c.from("reports").insert({ kind: "company", target_id: "00000000-0000-4000-8000-000000000000", reason: "other" });
    expect(ghost.error?.code).toBe("23503");
  });

  it("are private: others cannot read them and status cannot be set on insert", async () => {
    const a = await candidate();
    const b = await candidate();
    const { data: co } = await a.from("companies").select("id").limit(1).single();
    expect((await a.from("reports").insert({ kind: "company", target_id: co!.id, reason: "fake_company" })).error).toBeNull();
    expect((await b.from("reports").select("id")).data).toHaveLength(0);
    const sneaky = await b.from("reports").insert({ kind: "company", target_id: co!.id, reason: "other", status: "dismissed" } as never);
    expect(sneaky.error).not.toBeNull();
  });

  it("hides an interview note once three different people report it, and an admin can restore it", async () => {
    const author = await candidate();
    const { data: co } = await author.from("companies").select("id").eq("slug", "orchard-cloud").single();
    const { data: job } = await author.from("jobs").select("id").eq("company_id", co!.id).limit(1).single();
    await author.from("applications").insert({ job_id: job!.id });
    const note = await author.from("interview_insights").insert({ company_id: co!.id, role_title: "Platform Engineer", rounds: 2, difficulty: 3, outcome: "no_answer", experience: "Two rounds, one technical and one with the hiring manager. Slow to reply afterwards." }).select("id").single();
    expect(note.error).toBeNull();
    const id = note.data!.id;

    // the author cannot report their own note
    expect((await author.from("reports").insert({ kind: "insight", target_id: id, reason: "abusive" })).error?.code).toBe("22023");

    const reporters = [await candidate(), await candidate(), await candidate()];
    const viewer = await candidate();
    for (let i = 0; i < 3; i++) {
      expect((await viewer.from("peer_insights").select("id").eq("id", id)).data).toHaveLength(1 - (i === 3 ? 1 : 0));
      expect((await reporters[i].from("reports").insert({ kind: "insight", target_id: id, reason: "abusive" })).error).toBeNull();
    }
    expect((await viewer.from("peer_insights").select("id").eq("id", id)).data).toHaveLength(0);

    const ad = await admin();
    const { data: open } = await ad.from("reports").select("id").eq("target_id", id).eq("status", "open");
    expect(open).toHaveLength(3);
    const done = await ad.rpc("admin_resolve_report", { p_report: open![0].id, p_action: "dismiss" });
    expect(done.error).toBeNull();
    expect(done.data?.status).toBe("dismissed");
    expect((await viewer.from("peer_insights").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await ad.from("reports").select("id").eq("target_id", id).eq("status", "open")).data).toHaveLength(0);
  });

  it("only admins resolve, and 'action' closes a job or removes verification", async () => {
    const c = await candidate();
    const { data: job } = await c.from("jobs").select("id, closes_at").eq("slug", "ux-designer-healthcare").single();
    await c.from("reports").insert({ kind: "job", target_id: job!.id, reason: "asks_for_money" });
    const { data: mine } = await c.from("reports").select("id").eq("target_id", job!.id);
    expect((await c.rpc("admin_resolve_report", { p_report: mine![0].id, p_action: "action" })).error?.code).toBe("42501");

    const ad = await admin();
    expect((await ad.rpc("admin_resolve_report", { p_report: mine![0].id, p_action: "action" })).error).toBeNull();
    const { data: after } = await fresh().from("jobs").select("closes_at").eq("id", job!.id).single();
    expect(new Date(after!.closes_at!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
