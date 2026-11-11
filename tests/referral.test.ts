import { describe, expect, it } from "vitest";
import { collegeKey, draftReferralMessage, matchAlumni, type Employee } from "@/lib/referral";

const emp = (id: string, college: string, gradYear: number | null): Employee => ({ id, fullName: "Test Person " + id, title: "Engineer", college, gradYear });

describe("collegeKey", () => {
  it("drops filler words so common spellings agree", () => {
    expect(collegeKey("PSG College of Technology")).toBe("psg");
    expect(collegeKey("PSG Tech")).toBe("psg");
    expect(collegeKey("Anna University")).toBe("anna");
    expect(collegeKey("NIT Trichy")).toBe("nit trichy");
  });
  it("returns empty for text with no distinguishing word", () => expect(collegeKey("The College of Technology")).toBe(""));
});

describe("matchAlumni", () => {
  const staff = [emp("1", "PSG College of Technology", 2018), emp("2", "Anna University", 2020), emp("3", "PSG Tech", 2022), emp("4", "IIT Madras", 2015)];
  it("matches by college and puts recent graduates first", () => expect(matchAlumni(["PSG College of Technology"], staff).map((e) => e.id)).toEqual(["3", "1"]));
  it("matches any of several schools", () => expect(matchAlumni(["Anna University", "IIT Madras"], staff).map((e) => e.id).sort()).toEqual(["2", "4"]));
  it("matches nothing when the profile has no school, or an unrecognisable one", () => {
    expect(matchAlumni([], staff)).toEqual([]);
    expect(matchAlumni(["The College of Technology"], staff)).toEqual([]);
  });
});

describe("draftReferralMessage", () => {
  const base = { candidateFirstName: "Meera", contactName: "Dr. Ramesh Iyer", company: "Tamarind Health", jobTitle: "Frontend Engineer", sharedSkills: ["React", "TypeScript"] };
  it("alumni: names the shared college and asks for a chat before a referral", () => {
    const m = draftReferralMessage({ ...base, basis: { kind: "alumni", college: "PSG College of Technology" } });
    expect(m.startsWith("Hello Ramesh,")).toBe(true);
    expect(m).toContain("I also studied at PSG College of Technology.");
    expect(m).toContain("short chat about the team");
    expect(m).toContain("React, TypeScript");
    expect(m.endsWith("Meera")).toBe(true);
  });
  it("someone you know: uses the relationship and claims no skill without overlap", () => {
    const m = draftReferralMessage({ ...base, sharedSkills: [], basis: { kind: "know", relationship: "classmate" } });
    expect(m).toContain("we know each other as classmates");
    expect(m).not.toContain("background in");
  });
});
