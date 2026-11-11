import { describe, expect, it } from "vitest";
import { insightStats, plainInsightSummary } from "@/lib/insights";

const row = (rounds: number, difficulty: number, outcome: "offer" | "rejected" | "no_answer" | "withdrew", isSample = false) => ({ rounds, difficulty, outcome, isSample });

describe("insightStats", () => {
  it("is empty with no notes", () => expect(insightStats([])).toMatchObject({ count: 0, avgDifficulty: null, medianRounds: null }));
  it("computes count, mean difficulty, median rounds and outcome counts", () => {
    const s = insightStats([row(4, 4, "offer"), row(3, 3, "rejected"), row(3, 2, "no_answer", true), row(5, 5, "rejected")]);
    expect(s.count).toBe(4);
    expect(s.avgDifficulty).toBe(3.5);
    expect(s.medianRounds).toBe(3.5);
    expect(s.samples).toBe(1);
    expect(s.outcomes).toEqual({ offer: 1, rejected: 2, no_answer: 1, withdrew: 0 });
  });
});

describe("plainInsightSummary", () => {
  it("invites the first note when there are none", () => expect(plainInsightSummary(insightStats([]))[1]).toContain("Applied here?"));
  it("states the numbers, flags samples, and lists only outcomes that occurred", () => {
    const lines = plainInsightSummary(insightStats([row(4, 4, "offer", true), row(3, 3, "rejected")]));
    expect(lines[0]).toBe("2 notes from candidates (1 is a sample).");
    expect(lines[1]).toBe("Typically 3.5 rounds, difficulty 3.5 out of 5.");
    expect(lines[2]).toBe("Outcomes: 1 got an offer, 1 rejected.");
  });
  it("singular wording for a single note", () => expect(plainInsightSummary(insightStats([row(1, 1, "withdrew")]))[0]).toBe("1 note from candidates."));
});
