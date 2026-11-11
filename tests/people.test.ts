import { describe, expect, it } from "vitest";
import { draftFirstMessage, draftSubject } from "@/lib/people/message";
import { describeResponse } from "@/lib/people/response";

const base = { contactName: "Dr. Ramesh Iyer", contactKind: "founder" as const, company: "Tamarind Health", jobTitle: "Frontend Engineer, Patient App", candidateFirstName: "Meera", sharedSkills: ["React", "TypeScript"], headline: "Frontend developer at a logistics company" };

describe("first message draft", () => {
  it("greets by given name, skipping the title", () => {
    expect(draftFirstMessage(base).startsWith("Hello Ramesh,")).toBe(true);
  });
  it("names the role, company and shared skills, and nothing the profile lacks", () => {
    const m = draftFirstMessage(base);
    expect(m).toContain("the Frontend Engineer, Patient App role at Tamarind Health");
    expect(m).toContain("React and TypeScript");
    expect(m).toContain("I am Meera, frontend developer at a logistics company.");
  });
  it("makes no skill claim when there is no overlap, and copes with an empty headline", () => {
    const m = draftFirstMessage({ ...base, sharedSkills: [], headline: "" });
    expect(m).not.toContain("matches what the listing asks");
    expect(m).toContain("I am Meera.");
  });
  it("asks a recruiter about the role and a founder for ten minutes", () => {
    expect(draftFirstMessage({ ...base, contactKind: "recruiter" })).toContain("still open");
    expect(draftFirstMessage(base)).toContain("ten minutes");
  });
  it("uses at most three skills", () => {
    expect(draftFirstMessage({ ...base, sharedSkills: ["a", "b", "c", "d"] })).not.toContain(", d");
  });
  it("subject names the role", () => expect(draftSubject("QA Analyst")).toBe("QA Analyst: a short introduction"));
});

describe("reply-time sentence", () => {
  it("says so when there is no history", () => expect(describeResponse({ applications: 0, replied: 0, medianHours: null })).toContain("no reply history"));
  it("says no reply yet when nobody has been answered", () => expect(describeResponse({ applications: 2, replied: 0, medianHours: null })).toBe("No reply recorded yet across 2 applications on this site."));
  it("reports under a day and flags a small sample", () => {
    const s = describeResponse({ applications: 1, replied: 1, medianHours: 20 });
    expect(s).toContain("within about a day");
    expect(s).toContain("Small sample");
  });
  it("reports days and drops the caveat for larger samples", () => {
    const s = describeResponse({ applications: 8, replied: 6, medianHours: 96 });
    expect(s).toContain("about 4 days");
    expect(s).not.toContain("Small sample");
  });
});
