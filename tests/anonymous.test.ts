import { describe, expect, it } from "vitest";
import { isBlind, pseudonym, yearsOfExperience } from "@/lib/anonymous";

describe("isBlind", () => {
  it("not anonymous is never blind", () => expect(isBlind({ anonymous: false, statuses: ["applied"] })).toBe(false));
  it("anonymous stays blind through applied and under review", () => {
    expect(isBlind({ anonymous: true, statuses: ["applied"] })).toBe(true);
    expect(isBlind({ anonymous: true, statuses: ["applied", "under_review"] })).toBe(true);
  });
  it("is revealed once shortlisted, and stays revealed if later rejected", () => {
    expect(isBlind({ anonymous: true, statuses: ["applied", "under_review", "shortlisted"] })).toBe(false);
    expect(isBlind({ anonymous: true, statuses: ["applied", "shortlisted", "rejected"] })).toBe(false);
  });
  it("a rejection before shortlisting stays blind", () => expect(isBlind({ anonymous: true, statuses: ["applied", "under_review", "rejected"] })).toBe(true));
});

describe("pseudonym", () => {
  it("is stable and short", () => {
    expect(pseudonym("46e13fb9-5fa3-402e-b436-c7d77c30511c")).toBe("Candidate 46E13F");
    expect(pseudonym("46e13fb9-5fa3-402e-b436-c7d77c30511c")).toBe(pseudonym("46e13fb9-5fa3-402e-b436-c7d77c30511c"));
  });
});

describe("yearsOfExperience", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  it("adds up role periods", () => expect(yearsOfExperience(["2019-2022", "Jul 2023 - Present"], now)).toBe(6));
  it("ignores periods without a year", () => expect(yearsOfExperience(["a while"], now)).toBe(0));
});
