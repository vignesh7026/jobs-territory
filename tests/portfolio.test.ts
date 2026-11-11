import { describe, expect, it } from "vitest";
import { inferSkills, isGithubUsername, type Repo } from "@/lib/portfolio";

const repo = (o: Partial<Repo> & { name: string }): Repo => ({ language: null, topics: [], description: null, fork: false, archived: false, ...o });

describe("isGithubUsername", () => {
  it("accepts real-looking names", () => {
    for (const u of ["torvalds", "a", "user-name", "A1b2", "x".repeat(39)]) expect(isGithubUsername(u)).toBe(true);
  });
  it("rejects bad shapes, including anything that could change the URL", () => {
    for (const u of ["", "-bad", "bad-", "two--hyphens", "has space", "a/b", "x".repeat(40), "../etc", "user?x=1", "名前"]) expect(isGithubUsername(u)).toBe(false);
  });
});

describe("inferSkills", () => {
  const repos = [
    repo({ name: "dispatch-ui", language: "TypeScript", topics: ["react", "tailwindcss"], description: "Dashboard built with React and PostgreSQL" }),
    repo({ name: "api", language: "TypeScript", topics: ["nodejs", "docker"] }),
    repo({ name: "notes", language: "Jupyter Notebook" }),
    repo({ name: "forked-lib", language: "Rust", fork: true }),
    repo({ name: "old-thing", language: "Go", archived: true }),
  ];
  const result = inferSkills(repos, ["React", "Git"]);
  const bySkill = Object.fromEntries(result.map((r) => [r.skill, r]));

  it("reads languages, topics and descriptions", () => {
    expect(bySkill["TypeScript"].count).toBe(2);
    expect(bySkill["React"].repos).toEqual(["dispatch-ui"]);
    expect(bySkill["Node.js"].repos).toEqual(["api"]);
    expect(bySkill["PostgreSQL"].repos).toEqual(["dispatch-ui"]);
    expect(bySkill["Docker"]).toBeTruthy();
    expect(bySkill["Python"].repos).toEqual(["notes"]);
  });
  it("ignores forks and archived repositories", () => {
    expect(bySkill["Rust"]).toBeUndefined();
    expect(bySkill["Go"]).toBeUndefined();
  });
  it("marks what is already on the profile, comparing by skill key", () => {
    expect(bySkill["React"].onProfile).toBe(true);
    expect(bySkill["TypeScript"].onProfile).toBe(false);
  });
  it("sorts by how many repositories point to the skill", () => expect(result[0].skill).toBe("TypeScript"));
  it("returns nothing for no repositories", () => expect(inferSkills([], [])).toEqual([]));
});
