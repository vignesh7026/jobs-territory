import { describe, expect, it } from "vitest";
import { inspectAnswer, plainQuestions, plainScore, summarise } from "@/lib/interview";

const job = { title: "Backend Engineer, Lending", company: "Indus Ledger", skills: ["Node.js", "PostgreSQL", "Docker"] };

const strongStory =
  "When I joined my previous team, our payments API timed out for about 4 percent of requests. My role was to find the cause. I added tracing, found that a PostgreSQL query was scanning a 2 million row table, and I wrote a composite index and a migration. As a result, p95 latency dropped from 1.8 seconds to 220 milliseconds and timeouts fell to under 0.1 percent.";

describe("plainQuestions", () => {
  it("asks five questions mixing intro, behaviour and the job's own skills", () => {
    const q = plainQuestions(job);
    expect(q).toHaveLength(5);
    expect(q[0].kind).toBe("intro");
    expect(q[0].text).toContain("Indus Ledger");
    expect(q.filter((x) => x.kind === "skill").map((x) => x.text).join(" ")).toContain("Node.js");
    expect(q.filter((x) => x.kind === "skill").map((x) => x.text).join(" ")).toContain("PostgreSQL");
  });
  it("still works for a job with no listed skills", () => expect(plainQuestions({ ...job, skills: [] })).toHaveLength(5));
});

describe("plainScore", () => {
  it("rewards a structured, specific story", () => {
    const s = plainScore(strongStory, "behavioral");
    expect(s.structure).toBeGreaterThanOrEqual(4);
    expect(s.specificity).toBeGreaterThanOrEqual(4);
    expect(s.clarity).toBeGreaterThanOrEqual(3);
  });
  it("marks a vague one-liner low on everything and says why", () => {
    const s = plainScore("I worked on a lot of things and it went well.", "behavioral");
    expect(s.clarity).toBeLessThanOrEqual(2);
    expect(s.structure).toBeLessThanOrEqual(2);
    expect(s.specificity).toBe(1);
    expect(s.feedback.length).toBeGreaterThan(20);
    expect(s.tip.length).toBeGreaterThan(10);
  });
  it("penalises filler words", () => {
    const filler = "Um so basically like I you know actually did the thing, um, and basically it was like fine and you know that is it overall really.";
    expect(inspectAnswer(filler).fillers).toBeGreaterThanOrEqual(4);
    expect(plainScore(filler, "skill").clarity).toBeLessThanOrEqual(2);
  });
  it("scores stay between 1 and 5", () => {
    for (const a of ["", "a", strongStory, strongStory.repeat(6)]) {
      const s = plainScore(a, "skill");
      for (const v of [s.clarity, s.structure, s.specificity]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });
  it("a skill answer gets structure credit for ordering its steps", () => {
    const a = "First I would reproduce the problem, then check the logs because most failures show up there, and finally write a test.";
    expect(plainScore(a, "skill").structure).toBeGreaterThanOrEqual(3);
  });
});

describe("summarise", () => {
  it("is null with no answers", () => expect(summarise([])).toBeNull());
  it("averages and names strongest and weakest", () => {
    const s = summarise([
      { clarity: 4, structure: 2, specificity: 3, feedback: "", tip: "" },
      { clarity: 5, structure: 2, specificity: 3, feedback: "", tip: "" },
    ])!;
    expect(s.average).toBe(3.2);
    expect(s.strongest).toBe("clarity");
    expect(s.weakest).toBe("structure");
  });
});
