import { describe, expect, it } from "vitest";
import { isQuickApplyJob, quickApplyReadiness } from "@/lib/quick-apply";

describe("quick apply", () => {
  it("needs three skills", () => expect(quickApplyReadiness({ skills: ["a", "b"], hasResume: true, hasExperience: true })).toEqual({ ready: false, reason: "Add at least 3 skills to your profile first." }));
  it("needs a resume or a role", () => expect(quickApplyReadiness({ skills: ["a", "b", "c"], hasResume: false, hasExperience: false }).ready).toBe(false));
  it("is ready with skills and either a resume or a role", () => {
    expect(quickApplyReadiness({ skills: ["a", "b", "c"], hasResume: true, hasExperience: false }).ready).toBe(true);
    expect(quickApplyReadiness({ skills: ["a", "b", "c"], hasResume: false, hasExperience: true }).ready).toBe(true);
  });
  it("qualifies a strong, open, unapplied job", () => expect(isQuickApplyJob({ score: 78, applied: false, closed: false })).toBe(true));
  it("rejects weak matches (59), applied and closed jobs; 60 is the line", () => {
    expect(isQuickApplyJob({ score: 59, applied: false, closed: false })).toBe(false);
    expect(isQuickApplyJob({ score: 60, applied: false, closed: false })).toBe(true);
    expect(isQuickApplyJob({ score: 90, applied: true, closed: false })).toBe(false);
    expect(isQuickApplyJob({ score: 90, applied: false, closed: true })).toBe(false);
  });
});
