import { describe, expect, it } from "vitest";
import { dueForSweep, locationMatches, parseTerms, pickJobs, remainingToday, roleMatches, ruleSchema, whySkipped, type Candidate, type Rule } from "@/lib/auto-apply";
import type { MatchProfile } from "@/lib/match";

const now = new Date("2026-06-01T10:00:00Z");
const profile: MatchProfile = { skills: ["React", "TypeScript", "Testing", "CSS"], location: "Coimbatore", experiencePeriods: ["2023 - 2025"], hasExperience: true, hasResume: true };
const rule: Rule = { roles: ["frontend developer"], locations: ["Coimbatore"], includeRemote: false, minMatch: 50, dailyCap: 3, verifiedOnly: true };

const job = (o: Partial<Candidate> = {}): Candidate => ({
  id: "j1", slug: "j1", title: "Frontend Developer", company: "Acme", location: "Coimbatore", workMode: "onsite", level: "mid",
  skills: ["React", "TypeScript", "Testing"], postedAt: "2026-05-30T10:00:00Z", firstPostedAt: null, repostCount: 0, isVague: false,
  closesAt: "2026-06-20T10:00:00Z", companyVerified: true, ...o,
});

describe("parseTerms", () => {
  it("splits on commas, trims, drops blanks and repeats, caps at five", () => {
    expect(parseTerms(" frontend ,  React  developer,, FRONTEND ;a1;b2;c3;d4;e5")).toEqual(["frontend", "React developer", "a1", "b2", "c3"]);
  });
  it("returns nothing for empty text", () => expect(parseTerms("  , ")).toEqual([]));
});

describe("roleMatches", () => {
  it("needs every word of the role in the title, in any order", () => {
    expect(roleMatches("react developer", "Senior React Developer")).toBe(true);
    expect(roleMatches("developer react", "React Developer")).toBe(true);
    expect(roleMatches("react developer", "React Designer")).toBe(false);
  });
  it("does not match part of a word", () => expect(roleMatches("java", "JavaScript Developer")).toBe(false));
  it("an empty role matches nothing", () => expect(roleMatches("  ", "Anything")).toBe(false));
});

describe("locationMatches", () => {
  it("matches a place inside the job location, ignoring case", () => expect(locationMatches({ locations: ["coimbatore"], includeRemote: false }, { location: "Coimbatore, TN", workMode: "onsite" })).toBe(true));
  it("remote jobs match only when remote is allowed", () => {
    expect(locationMatches({ locations: ["Pune"], includeRemote: true }, { location: "Anywhere", workMode: "remote" })).toBe(true);
    expect(locationMatches({ locations: ["Pune"], includeRemote: false }, { location: "Anywhere", workMode: "remote" })).toBe(false);
  });
});

describe("whySkipped", () => {
  const none = new Set<string>();
  it("accepts a good job", () => expect(whySkipped(rule, profile, job(), none, now).skip).toBeNull());
  it("closed", () => expect(whySkipped(rule, profile, job({ closesAt: "2026-05-31T00:00:00Z" }), none, now).skip).toBe("closed"));
  it("already applied", () => expect(whySkipped(rule, profile, job(), new Set(["j1"]), now).skip).toBe("applied"));
  it("wrong role", () => expect(whySkipped(rule, profile, job({ title: "Sales Manager" }), none, now).skip).toBe("role"));
  it("wrong place", () => expect(whySkipped(rule, profile, job({ location: "Delhi" }), none, now).skip).toBe("location"));
  it("unverified company only when the rule asks for verified", () => {
    expect(whySkipped(rule, profile, job({ companyVerified: false }), none, now).skip).toBe("unverified");
    expect(whySkipped({ ...rule, verifiedOnly: false }, profile, job({ companyVerified: false }), none, now).skip).toBeNull();
  });
  it("stale or vague listings are never auto-applied to", () => {
    expect(whySkipped(rule, profile, job({ isVague: true, firstPostedAt: "2026-01-01T00:00:00Z", repostCount: 4 }), none, now).skip).toBe("listing");
  });
  it("below the match floor", () => {
    const r = whySkipped({ ...rule, minMatch: 100 }, { ...profile, skills: ["Cooking"] }, job(), none, now);
    expect(r.skip).toBe("low-match");
  });
});

describe("pickJobs", () => {
  const none = new Set<string>();
  const jobs = [job({ id: "a", skills: ["React"] }), job({ id: "b" }), job({ id: "c", skills: ["React", "TypeScript", "Testing", "CSS"] })];
  it("best match first and never more than remaining", () => {
    const picks = pickJobs({ ...rule, minMatch: 40 }, profile, jobs, none, 2, now);
    expect(picks).toHaveLength(2);
    expect(picks[0].score).toBeGreaterThanOrEqual(picks[1].score);
  });
  it("nothing when the allowance is used up", () => expect(pickJobs(rule, profile, jobs, none, 0, now)).toEqual([]));
  it("skips jobs already applied to", () => expect(pickJobs(rule, profile, [job()], new Set(["j1"]), 3, now)).toEqual([]));
});

describe("limits", () => {
  it("remainingToday never goes below zero", () => {
    expect(remainingToday(3, 1)).toBe(2);
    expect(remainingToday(3, 5)).toBe(0);
  });
  it("sweeps at most every 30 minutes", () => {
    expect(dueForSweep(null, now)).toBe(true);
    expect(dueForSweep("2026-06-01T09:45:00Z", now)).toBe(false);
    expect(dueForSweep("2026-06-01T09:20:00Z", now)).toBe(true);
  });
});

describe("ruleSchema", () => {
  const ok = { roles: ["frontend developer"], locations: ["Coimbatore"], includeRemote: false, minMatch: 60, dailyCap: 3, verifiedOnly: true, consent: true };
  it("accepts a complete rule", () => expect(ruleSchema.safeParse(ok).success).toBe(true));
  it("requires consent", () => expect(ruleSchema.safeParse({ ...ok, consent: false }).success).toBe(false));
  it("requires a role", () => expect(ruleSchema.safeParse({ ...ok, roles: [] }).success).toBe(false));
  it("requires a place or remote", () => {
    expect(ruleSchema.safeParse({ ...ok, locations: [] }).success).toBe(false);
    expect(ruleSchema.safeParse({ ...ok, locations: [], includeRemote: true }).success).toBe(true);
  });
  it("keeps the match floor and daily cap in range", () => {
    expect(ruleSchema.safeParse({ ...ok, minMatch: 20 }).success).toBe(false);
    expect(ruleSchema.safeParse({ ...ok, dailyCap: 50 }).success).toBe(false);
  });
});
