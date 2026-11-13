import { describe, expect, it } from "vitest";
import { estimateYears } from "@/lib/experience";
import { computeMatch, fallbackExplanation, tierOf, type MatchJob, type MatchProfile } from "@/lib/match";
import { skillKey } from "@/lib/skills";

const now = new Date("2026-11-11T00:00:00Z");
const profile = (over: Partial<MatchProfile> = {}): MatchProfile => ({
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Git"],
  location: "Coimbatore, Tamil Nadu",
  experiencePeriods: ["Jul 2023 - Present"],
  hasExperience: true,
  hasResume: true,
  ...over,
});
const job = (over: Partial<MatchJob> = {}): MatchJob => ({ skills: ["React", "TypeScript", "Node.js", "PostgreSQL"], level: "mid", workMode: "hybrid", location: "Coimbatore", title: "Full Stack Engineer", ...over });

describe("skillKey", () => {
  it("folds spelling variants together", () => {
    expect(skillKey("Node.js")).toBe(skillKey("nodejs"));
    expect(skillKey("REST APIs")).toBe(skillKey("REST"));
    expect(skillKey("Postgres")).toBe(skillKey("PostgreSQL"));
    expect(skillKey("React.js")).toBe(skillKey("react"));
    expect(skillKey("C++")).not.toBe(skillKey("C#"));
  });
});

describe("estimateYears", () => {
  it("reads month-year ranges and Present", () => expect(estimateYears(["Jul 2023 - Present"], now)).toBe(3.5));
  it("counts overlapping roles once", () => expect(estimateYears(["Jan 2022 - Dec 2023", "Jul 2023 - Dec 2024"], now)).toBe(3));
  it("returns null when nothing is readable", () => {
    expect(estimateYears(["a while", ""], now)).toBeNull();
    expect(estimateYears([], now)).toBeNull();
  });
  it("ignores impossible ranges", () => expect(estimateYears(["Dec 2024 - Jan 2020"], now)).toBeNull());
});

describe("computeMatch", () => {
  it("scores 100 for a full skill overlap and says strong", () => {
    const m = computeMatch(profile(), job(), now);
    expect(m.score).toBe(100);
    expect(m.tier).toBe("strong");
    expect(m.missing).toEqual([]);
  });

  it("scores the share of listed skills and names the missing ones in listing order", () => {
    const m = computeMatch(profile(), job({ skills: ["React", "Playwright", "GraphQL", "Git"] }), now);
    expect(m.score).toBe(50);
    expect(m.matched).toEqual(["React", "Git"]);
    expect(m.missing).toEqual(["Playwright", "GraphQL"]);
    expect(m.gaps.find((g) => g.id === "skills")?.text).toMatch(/Playwright and GraphQL/);
  });

  it("scores 0 with an honest note when the profile has almost no skills", () => {
    const m = computeMatch(profile({ skills: [] }), job(), now);
    expect(m.score).toBe(0);
    expect(m.gaps[0].id).toBe("thin-profile");
    expect(m.gaps[0].severity).toBe("high");
  });

  it("flags a level gap with the actual numbers", () => {
    const m = computeMatch(profile(), job({ level: "senior" }), now);
    const g = m.gaps.find((x) => x.id === "level");
    expect(g?.text).toBe("This is a senior role, usually 5+ years. Your profile shows about 3.5 years.");
    expect(g?.severity).toBe("medium");
    expect(computeMatch(profile(), job({ level: "lead" }), now).gaps.find((x) => x.id === "level")?.severity).toBe("high");
  });

  it("does not flag level when experience is enough", () => expect(computeMatch(profile(), job({ level: "mid" }), now).gaps.some((g) => g.id.startsWith("level"))).toBe(false));

  it("says so when experience has no readable dates, instead of guessing", () => {
    const m = computeMatch(profile({ experiencePeriods: ["a few years"] }), job({ level: "senior" }), now);
    expect(m.gaps.some((g) => g.id === "level-unknown")).toBe(true);
    expect(m.years).toBeNull();
  });

  it("flags location for on-site and hybrid jobs, never for remote", () => {
    expect(computeMatch(profile(), job({ workMode: "onsite", location: "Dublin" }), now).gaps.some((g) => g.id === "location")).toBe(true);
    expect(computeMatch(profile(), job({ workMode: "remote", location: "Dublin" }), now).gaps.some((g) => g.id.startsWith("location"))).toBe(false);
    expect(computeMatch(profile(), job({ workMode: "hybrid", location: "Coimbatore" }), now).gaps.some((g) => g.id.startsWith("location"))).toBe(false);
  });

  it("notes a missing resume and an over-qualified intern", () => {
    expect(computeMatch(profile({ hasResume: false }), job(), now).gaps.some((g) => g.id === "resume")).toBe(true);
    expect(computeMatch(profile(), job({ level: "intern" }), now).gaps.some((g) => g.id === "overqualified")).toBe(true);
  });

  it("orders gaps most serious first", () => {
    const m = computeMatch(profile({ hasResume: false, location: "Pune" }), job({ level: "lead", workMode: "onsite", location: "Dublin", skills: ["Rust", "Go", "C++"] }), now);
    const order = m.gaps.map((g) => g.severity);
    expect(order).toEqual([...order].sort((a, b) => ["high", "medium", "low"].indexOf(a) - ["high", "medium", "low"].indexOf(b)));
  });

  it("matches skills through aliases", () => {
    const m = computeMatch(profile({ skills: ["nodejs", "postgres", "React.js", "REST API"] }), job({ skills: ["Node.js", "PostgreSQL", "React", "REST APIs"] }), now);
    expect(m.score).toBe(100);
  });

  it("handles a job with no listed skills", () => expect(computeMatch(profile(), job({ skills: [] }), now).score).toBe(0));
});

describe("tiers and the plain-language fallback", () => {
  it("tiers by score", () => {
    expect(tierOf(100)).toBe("strong");
    expect(tierOf(70)).toBe("strong");
    expect(tierOf(69)).toBe("partial");
    expect(tierOf(40)).toBe("partial");
    expect(tierOf(39)).toBe("low");
  });
  it("explains in two lines", () => {
    const m = computeMatch(profile(), job({ skills: ["React", "Playwright", "GraphQL", "Git"] }), now);
    const [a, b] = fallbackExplanation(m, 4);
    expect(a).toBe("You have 2 of the 4 listed skills: React and Git.");
    expect(b).toMatch(/Playwright and GraphQL/);
  });
  it("is positive when there are no gaps", () => {
    const m = computeMatch(profile(), job(), now);
    expect(fallbackExplanation(m, 4)[1]).toMatch(/lines up/);
  });
  it("is plain when nothing matches", () => {
    const m = computeMatch(profile({ skills: ["Excel", "SQL", "Power BI"] }), job(), now);
    expect(fallbackExplanation(m, 4)[0]).toBe("None of the 4 skills listed for this job are on your profile.");
  });
});

describe("estimateYears with year-only ranges", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  it("reads 2022 - 2025 as about three years, counted January to December", () => {
    expect(estimateYears(["2022 - 2025"], now)).toBe(4);
    expect(estimateYears(["2019-2023"], now)).toBe(5);
  });
  it("reads an open range up to now, and merges overlaps with month ranges", () => {
    expect(estimateYears(["2024 - Present"], now)).toBe(2.5);
    expect(estimateYears(["Jan 2022 - Dec 2022", "2022 - 2023"], now)).toBe(2);
  });
  it("still returns null for text with no dates", () => {
    expect(estimateYears(["recently", ""], now)).toBeNull();
  });
});
