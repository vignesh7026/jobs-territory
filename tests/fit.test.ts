import { describe, expect, it } from "vitest";
import { WEIGHTS, alsoMentionedSkills, bandOf, fitReport, listingAsksForDegree, roleOverlap, type FitJob, type FitProfile } from "@/lib/fit";

const now = new Date("2026-06-01T00:00:00Z");

const job: FitJob = {
  title: "Frontend Engineer, Patient App",
  level: "mid",
  workMode: "hybrid",
  location: "Chennai",
  skills: ["React", "TypeScript", "Testing", "Accessibility"],
  summary: "Build the patient app used in 1,400 clinics.",
  responsibilities: ["Build components in React", "Deploy with Docker", "Review pull requests in Git"],
  requirements: ["B.E. or B.Tech in computer science", "3 years of frontend experience"],
};

const full: FitProfile = {
  headline: "Frontend developer",
  summary: "Frontend developer focused on accessible interfaces.",
  phone: "+91 98430 27719",
  location: "Chennai, Tamil Nadu",
  skills: ["React", "TypeScript", "Testing", "Accessibility", "Git"],
  experience: [{ title: "Frontend Developer", company: "Acme", period: "2022 - 2025", description: "" }],
  education: [{ school: "Anna University", degree: "B.E. Computer Science", year: "2022" }],
  hasResume: true,
};

const empty: FitProfile = { headline: "", summary: "", phone: "", location: "", skills: [], experience: [], education: [], hasResume: false };
const part = (r: ReturnType<typeof fitReport>, id: string) => r.parts.find((p) => p.id === id)!;

describe("fitReport", () => {
  it("weights add up to exactly 100", () => expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100));

  it("a complete matching profile scores 100 with nothing missing", () => {
    const r = fitReport(full, job, now);
    expect(r.total).toBe(100);
    expect(r.band).toBe("strong");
    expect(r.missingSkills).toEqual([]);
    expect(r.missingDetails).toEqual([]);
  });

  it("an empty profile scores low and lists every missing detail, highest priority first", () => {
    const r = fitReport(empty, job, now);
    expect(r.total).toBeLessThan(25);
    expect(r.band).toBe("weak");
    const ids = r.missingDetails.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["resume", "skills", "experience", "education", "summary", "headline", "phone", "location"]));
    const sev = r.missingDetails.map((m) => m.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a] - ({ high: 0, medium: 1, low: 2 })[b]));
    expect(r.missingDetails.every((m) => m.href.startsWith("/profile#"))).toBe(true);
  });

  it("parts always add up to the total and never exceed their maximum", () => {
    for (const p of [full, empty, { ...full, skills: ["React"], location: "Delhi", hasResume: false }]) {
      const r = fitReport(p, job, now);
      expect(r.parts.reduce((n, x) => n + x.got, 0)).toBe(r.total);
      for (const x of r.parts) {
        expect(x.got).toBeGreaterThanOrEqual(0);
        expect(x.got).toBeLessThanOrEqual(x.max);
      }
    }
  });

  it("skills are scored by share of listed skills, and the missing ones are named", () => {
    const r = fitReport({ ...full, skills: ["React", "TypeScript"] }, job, now);
    expect(part(r, "skills").got).toBe(Math.round(WEIGHTS.skills / 2));
    expect(r.missingSkills).toEqual(["Testing", "Accessibility"]);
    expect(r.matchedSkills).toEqual(["React", "TypeScript"]);
  });

  it("a listing with no named skills is not held against the candidate", () => {
    expect(part(fitReport(full, { ...job, skills: [] }, now), "skills").got).toBe(WEIGHTS.skills);
  });

  it("experience is proportional to the years the level usually needs", () => {
    const oneYear = { ...full, experience: [{ title: "Dev", company: "X", period: "2026 - Present", description: "" }] };
    const r = fitReport(oneYear, job, now); // mid needs 2
    expect(part(r, "experience").got).toBeLessThan(WEIGHTS.experience);
    expect(part(r, "experience").got).toBeGreaterThan(0);
    expect(part(fitReport(empty, { ...job, level: "intern" }, now), "experience").got).toBe(WEIGHTS.experience);
  });

  it("location: remote is free, same city full, a different city none, unknown half", () => {
    expect(part(fitReport(empty, { ...job, workMode: "remote" }, now), "location").got).toBe(WEIGHTS.location);
    expect(part(fitReport(full, job, now), "location").got).toBe(WEIGHTS.location);
    expect(part(fitReport({ ...full, location: "Delhi" }, job, now), "location").got).toBe(0);
    expect(part(fitReport({ ...full, location: "" }, job, now), "location").got).toBe(WEIGHTS.location / 2);
  });

  it("education only counts against you when the listing asks for a qualification", () => {
    expect(part(fitReport({ ...full, education: [] }, job, now), "education").got).toBe(0);
    const noDegree = { ...job, requirements: ["Good written English"] };
    expect(part(fitReport({ ...full, education: [] }, noDegree, now), "education").got).toBe(WEIGHTS.education);
  });

  it("profile basics: each missing basic lowers the part and appears in the missing list", () => {
    const r = fitReport({ ...full, hasResume: false, phone: "" }, job, now);
    expect(part(r, "profile").got).toBe(WEIGHTS.profile - 4 - 2);
    expect(r.missingDetails.map((m) => m.id)).toEqual(expect.arrayContaining(["resume", "phone"]));
    expect(r.missingDetails[0].id).toBe("resume"); // resume is the one to do first
  });

  it("a remote job does not ask for a location", () => {
    const r = fitReport({ ...full, location: "" }, { ...job, workMode: "remote" }, now);
    expect(r.missingDetails.map((m) => m.id)).not.toContain("location");
  });
});

describe("roleOverlap", () => {
  it("uses meaningful words only, ignoring seniority and connectors", () => {
    expect(roleOverlap("Senior Frontend Engineer", "Frontend developer", [])).toBe(1); // developer and engineer are the same role word
    expect(roleOverlap("Frontend Engineer", "", ["Frontend Engineer"])).toBe(1);
    expect(roleOverlap("Sales Manager", "Frontend developer", ["Web Developer"])).toBe(0);
    expect(roleOverlap("Intern", "", [])).toBe(0);
  });
});

describe("alsoMentionedSkills (what the description says beyond the skills list)", () => {
  it("finds named skills in the text that are neither listed nor on the profile", () => {
    const extra = alsoMentionedSkills(job, ["React", "TypeScript", "Testing", "Accessibility"]);
    expect(extra).toEqual(expect.arrayContaining(["Docker", "Git"]));
    expect(extra).not.toContain("React");
  });
  it("skips ones the profile already has and generic words from ordinary sentences", () => {
    const j = { ...job, summary: "We go live often. Good communication and leadership matter. Safety first.", responsibilities: [], requirements: [] };
    expect(alsoMentionedSkills(j, [])).toEqual([]);
    expect(alsoMentionedSkills(job, ["Git", "Docker"])).not.toEqual(expect.arrayContaining(["Git"]));
  });
});

describe("helpers", () => {
  it("bands", () => {
    expect(bandOf(70)).toBe("strong");
    expect(bandOf(69)).toBe("fair");
    expect(bandOf(45)).toBe("fair");
    expect(bandOf(44)).toBe("weak");
  });
  it("spots a degree requirement", () => {
    expect(listingAsksForDegree(["B.E. or B.Tech in civil engineering"])).toBe(true);
    expect(listingAsksForDegree(["Graduate in any discipline"])).toBe(true);
    expect(listingAsksForDegree(["Comfortable with Excel"])).toBe(false);
  });
});
