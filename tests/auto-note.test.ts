import { describe, expect, it } from "vitest";
import { buildAutoNote, sharedSkills } from "@/lib/auto-note";

describe("sharedSkills", () => {
  it("keeps the job's spelling and order, folds aliases, drops repeats and caps the count", () => {
    expect(sharedSkills(["nodejs", "REACT", "sql"], ["React", "Node.js", "React", "Go", "SQL"])).toEqual(["React", "Node.js", "SQL"]);
    expect(sharedSkills(["a1", "b2", "c3", "d4", "e5"], ["a1", "b2", "c3", "d4", "e5"], 4)).toHaveLength(4);
  });
  it("is empty when nothing overlaps", () => expect(sharedSkills(["Cooking"], ["React"])).toEqual([]));
});

describe("buildAutoNote", () => {
  const base = { firstName: "Meera", title: "Frontend Engineer", company: "Acme", profileSkills: ["React", "TypeScript"], jobSkills: ["React", "TypeScript", "GraphQL"], score: 67 };
  it("names only shared skills and the real score, and signs with the first name", () => {
    const n = buildAutoNote(base);
    expect(n).toContain("Hello Acme team,");
    expect(n).toContain("React and TypeScript");
    expect(n).not.toContain("GraphQL");
    expect(n).toContain("67% skill match");
    expect(n.trimEnd().endsWith("Meera")).toBe(true);
  });
  it("makes no skills claim when none are shared, and never invents experience", () => {
    const n = buildAutoNote({ ...base, profileSkills: ["Cooking"] });
    expect(n).not.toContain("My profile lists");
    expect(n).not.toMatch(/years|experience of|led |built /i);
  });
  it("stays well under the 3000-character limit", () => expect(buildAutoNote(base).length).toBeLessThan(600));
});
