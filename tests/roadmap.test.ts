import { describe, expect, it } from "vitest";
import { plainRoadmap, planToRows, progress, resourceFor } from "@/lib/roadmap";

describe("resourceFor", () => {
  it("returns a fixed, https link for known skills, whatever the spelling", () => {
    expect(resourceFor("Node.js").url).toBe("https://nodejs.org/en/learn");
    expect(resourceFor("nodejs").url).toBe("https://nodejs.org/en/learn");
    expect(resourceFor("PostgreSQL").url).toMatch(/^https:\/\/www\.postgresql\.org\//);
  });
  it("falls back to a general guide for unknown skills instead of inventing a link", () => expect(resourceFor("Underwater Basket Weaving").url).toBe("https://roadmap.sh/"));
});

describe("plainRoadmap", () => {
  it("gives each missing skill a week with three steps, in order", () => {
    const p = plainRoadmap(["GraphQL", "Accessibility", "Kubernetes"], 3);
    expect(p.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(p.map((w) => w.skill)).toEqual(["GraphQL", "Accessibility", "Kubernetes"]);
    expect(p.every((w) => w.tasks.length === 3)).toBe(true);
  });
  it("spends two weeks per skill (learn, then build) when there is room", () => {
    const p = plainRoadmap(["GraphQL", "Docker"], 4);
    expect(p.map((w) => [w.week, w.skill])).toEqual([[1, "GraphQL"], [2, "GraphQL"], [3, "Docker"], [4, "Docker"]]);
    expect(p[1].tasks[0]).toContain("Build a small project");
  });
  it("never exceeds the requested weeks or 8", () => {
    expect(plainRoadmap(["a", "b", "c", "d", "e", "f"], 4).length).toBeLessThanOrEqual(4);
    expect(plainRoadmap(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 20).length).toBeLessThanOrEqual(8);
  });
  it("with nothing missing, plans portfolio and interview practice", () => {
    const p = plainRoadmap([], 4);
    expect(p.map((w) => w.skill)).toEqual(["Portfolio", "Interviews"]);
  });
});

describe("planToRows", () => {
  it("attaches fixed links and ignores anything extra the model sent", () => {
    const rows = planToRows([{ week: 1, skill: "Docker", tasks: ["a", "b"], url: "https://evil.example" } as never]);
    expect(rows).toHaveLength(2);
    expect(rows[0].resource_url).toBe("https://docs.docker.com/get-started/");
  });
  it("drops weeks outside 1 to 12 and caps tasks per week at 4", () => {
    expect(planToRows([{ week: 0, skill: "x", tasks: ["t"] }, { week: 13, skill: "x", tasks: ["t"] }])).toEqual([]);
    expect(planToRows([{ week: 2, skill: "Git", tasks: ["1", "2", "3", "4", "5"] }])).toHaveLength(4);
  });
});

describe("progress", () => {
  it("counts done items", () => expect(progress([{ done: true }, { done: false }, { done: true }, { done: false }])).toEqual({ done: 2, total: 4, percent: 50 }));
  it("handles an empty plan", () => expect(progress([])).toEqual({ done: 0, total: 0, percent: 0 }));
});
