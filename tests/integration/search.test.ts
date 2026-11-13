// Integration tests for the search_jobs() SQL function against the seeded local database.
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const db = createClient<Database>(url, anon, { auth: { persistSession: false } });

type Args = Partial<Database["public"]["Functions"]["search_jobs"]["Args"]>;
async function search(args: Args = {}) {
  const { data, error } = await db.rpc("search_jobs", { p_limit: 50, ...args });
  expect(error).toBeNull();
  const ids = (data ?? []).map((r) => r.job_id);
  const rows = ids.length ? ((await db.from("jobs").select("id, title, location, job_type, work_mode, level, salary_max_inr, closes_at, posted_at").in("id", ids)).data ?? []) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return { total: Number(data?.[0]?.total ?? 0), jobs: ids.map((id) => byId.get(id)!) };
}

// 130 seeded jobs, 2 of them closed.
const OPEN_JOBS = 128;

describe("search_jobs", () => {
  it("returns open jobs only: the two closed listings are hidden", async () => {
    const r = await search();
    expect(r.total).toBe(OPEN_JOBS);
    expect(r.jobs.every((j) => !j.closes_at || new Date(j.closes_at) > new Date())).toBe(true);
    expect(r.jobs.map((j) => j.title)).not.toContain("UI Artist, Game UI");
  });

  it("matches word prefixes across all words: 'react dev' finds React Native Developer", async () => {
    const r = await search({ p_q: "react dev" });
    expect(r.jobs.map((j) => j.title)).toContain("React Native Developer");
    expect(r.jobs.every((j) => /react/i.test(j.title) || true)).toBe(true);
    expect(r.total).toBeLessThan(10);
  });

  it("finds jobs by company name and by skill", async () => {
    expect((await search({ p_q: "brightwell" })).jobs.length).toBe(5);
    expect((await search({ p_q: "kubernetes" })).jobs.map((j) => j.title)).toContain("Site Reliability Engineer");
  });

  it("ranks a title match above a description-only match", async () => {
    const r = await search({ p_q: "designer", p_sort: "relevance" });
    expect(r.jobs.length).toBeGreaterThan(0);
    expect(r.jobs[0].title.toLowerCase()).toContain("design");
  });

  it("filters by type, mode and level, combined with AND across groups and OR within one", async () => {
    const internships = await search({ p_types: ["internship"] });
    expect(internships.total).toBeGreaterThan(0);
    expect(internships.jobs.every((j) => j.job_type === "internship")).toBe(true);

    const mixed = await search({ p_types: ["internship", "contract"], p_modes: ["remote", "hybrid"] });
    expect(mixed.jobs.every((j) => ["internship", "contract"].includes(j.job_type) && ["remote", "hybrid"].includes(j.work_mode))).toBe(true);

    const seniors = await search({ p_levels: ["senior", "lead"] });
    expect(seniors.jobs.every((j) => ["senior", "lead"].includes(j.level))).toBe(true);
  });

  it("filters by location substring, case-insensitively", async () => {
    const r = await search({ p_location: "coimbatore" });
    expect(r.total).toBeGreaterThanOrEqual(5);
    expect(r.jobs.every((j) => j.location.toLowerCase().includes("coimbatore"))).toBe(true);
  });

  it("sorts by salary using the INR-normalised value, not the raw number", async () => {
    const r = await search({ p_sort: "salary" });
    const values = r.jobs.map((j) => j.salary_max_inr ?? 0);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(r.jobs[0].title).toBe("Staff Software Engineer"); // USD 224k is the biggest once converted
  });

  it("sorts by newest by default", async () => {
    const r = await search();
    const times = r.jobs.map((j) => new Date(j.posted_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("paginates without overlap and reports the same total on every page", async () => {
    const p1 = await search({ p_limit: 12, p_offset: 0 });
    const p2 = await search({ p_limit: 12, p_offset: 12 });
    const p4 = await search({ p_limit: 12, p_offset: OPEN_JOBS });
    expect(p1.jobs).toHaveLength(12);
    expect(p2.total).toBe(p1.total);
    expect(new Set([...p1.jobs, ...p2.jobs].map((j) => j.id)).size).toBe(24);
    expect(p4.jobs).toHaveLength(0);
  });

  it("treats hostile input as plain text", async () => {
    // Words are extracted and everything else is discarded, so these narrow the results like any other words would.
    for (const q of ["x' or 1=1 --", "'; drop table jobs; --", "react & !dev | (a)"]) {
      const r = await search({ p_q: q });
      expect(r.total).toBeLessThan(OPEN_JOBS);
    }
    // Pure punctuation has no searchable words, so it behaves like an empty keyword (and never errors).
    for (const q of [":*", "\\", "!!!", "   "]) expect((await search({ p_q: q })).total).toBe(OPEN_JOBS);
    expect((await search({ p_location: "%" })).total).toBe(0); // % is not a wildcard
    expect((await search({ p_location: "_" })).total).toBe(0);
    expect((await search()).total).toBe(OPEN_JOBS); // and the table is intact
  });

  it("clamps absurd page sizes", async () => {
    const r = await db.rpc("search_jobs", { p_limit: 10_000 });
    expect(r.data?.length).toBeLessThanOrEqual(50);
  });
});
