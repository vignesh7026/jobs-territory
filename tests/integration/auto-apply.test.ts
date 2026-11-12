// Integration tests for auto-apply: the rule is private, the run respects the cap and never duplicates, and what it
// sends is flagged. Real database, real RLS.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getRule, runAutoApply } from "@/lib/auto-apply-run";
import type { MatchProfile } from "@/lib/match";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
type Db = SupabaseClient<Database>;

const SKILLS = ["React", "TypeScript", "JavaScript", "Node.js", "SQL", "Testing", "Python"];
const profile: MatchProfile = { skills: SKILLS, location: "Bengaluru", experiencePeriods: ["2023 - 2025"], hasExperience: true, hasResume: false };

async function newCandidate(): Promise<{ db: Db; id: string }> {
  const db = createClient<Database>(url, anon, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signUp({ email: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: "test-pass-1234" });
  if (error || !data.session || !data.user) throw new Error(`signUp failed: ${error?.message}`);
  return { db, id: data.user.id };
}

const everyPlace = ["Bengaluru", "Coimbatore", "Pune", "Chennai", "Hyderabad", "Mumbai", "Gurugram", "Delhi", "Kochi", "London", "Dublin", "Singapore", "Toronto", "Austin"];
const baseRule = (id: string, o: Partial<Database["public"]["Tables"]["auto_apply_rules"]["Insert"]> = {}) => ({
  candidate_id: id, roles: ["engineer"], locations: everyPlace.slice(0, 5), min_match: 40, daily_cap: 2, verified_only: true, enabled: true, ...o,
});

describe("auto-apply rules", () => {
  it("are private to their owner", async () => {
    const a = await newCandidate();
    const b = await newCandidate();
    expect((await a.db.from("auto_apply_rules").insert(baseRule(a.id))).error).toBeNull();
    expect(await getRule(b.db, a.id)).toBeNull();
    // cannot write a rule for someone else
    expect((await b.db.from("auto_apply_rules").insert(baseRule(a.id))).error).not.toBeNull();
  });

  it("reject a rule with no place and no remote, or too many roles", async () => {
    const a = await newCandidate();
    expect((await a.db.from("auto_apply_rules").insert(baseRule(a.id, { locations: [], include_remote: false }))).error).not.toBeNull();
    expect((await a.db.from("auto_apply_rules").insert(baseRule(a.id, { roles: ["a1", "b2", "c3", "d4", "e5", "f6"] }))).error).not.toBeNull();
  });

  it("apply within the daily cap, flag what they send, and never duplicate", async () => {
    const a = await newCandidate();
    await a.db.from("auto_apply_rules").insert(baseRule(a.id));
    const first = await runAutoApply(a.db, a.id, profile, { force: true });
    expect(first.ran).toBe(true);
    expect(first.applied.length).toBeGreaterThan(0);
    expect(first.applied.length).toBeLessThanOrEqual(2);

    const { data: rows } = await a.db.from("applications").select("job_id, auto_applied").eq("candidate_id", a.id);
    expect(rows).toHaveLength(first.applied.length);
    expect(rows!.every((r) => r.auto_applied)).toBe(true);

    // a second forced run is blocked by the daily cap, so nothing more goes out
    const second = await runAutoApply(a.db, a.id, profile, { force: true });
    expect(second.applied).toHaveLength(Math.max(0, 2 - first.applied.length));
    const { data: all } = await a.db.from("applications").select("job_id").eq("candidate_id", a.id);
    expect(new Set(all!.map((r) => r.job_id)).size).toBe(all!.length);
  });

  it("only apply to verified companies when asked", async () => {
    const a = await newCandidate();
    await a.db.from("auto_apply_rules").insert(baseRule(a.id, { roles: ["designer"], daily_cap: 10, verified_only: true }));
    await runAutoApply(a.db, a.id, profile, { force: true });
    const { data } = await a.db.from("applications").select("jobs(companies(slug, verified))").eq("candidate_id", a.id);
    for (const r of data ?? []) {
      const j = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
      const c = Array.isArray(j?.companies) ? j?.companies[0] : j?.companies;
      expect(c?.verified).toBe(true);
    }
  });

  it("send nothing while paused, and nothing when the profile is not ready", async () => {
    const a = await newCandidate();
    await a.db.from("auto_apply_rules").insert(baseRule(a.id, { enabled: false }));
    const paused = await runAutoApply(a.db, a.id, profile, { force: true });
    expect(paused.ran).toBe(false);
    await a.db.from("auto_apply_rules").update({ enabled: true }).eq("candidate_id", a.id);
    const thin = await runAutoApply(a.db, a.id, { ...profile, skills: ["React"] }, { force: true });
    expect(thin.ran).toBe(false);
    expect((await a.db.from("applications").select("id").eq("candidate_id", a.id)).data).toHaveLength(0);
  });

  it("are not re-run within 30 minutes unless forced", async () => {
    const a = await newCandidate();
    await a.db.from("auto_apply_rules").insert(baseRule(a.id));
    await runAutoApply(a.db, a.id, profile, { force: true });
    const again = await runAutoApply(a.db, a.id, profile);
    expect(again.ran).toBe(false);
  });
});
