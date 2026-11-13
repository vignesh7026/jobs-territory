import { describe, expect, it } from "vitest";
import { fitReport, type FitProfile } from "@/lib/fit";
import { levelFromText, parseJd, skillsInText } from "@/lib/jd";

const JD = `We are hiring a Senior Backend Engineer.
- 5+ years of experience building services in Python and PostgreSQL
- Experience with Docker, Kubernetes and AWS
- B.E. or B.Tech in computer science
- You will go live with releases every week. Good communication matters.
Fully remote.`;

describe("skillsInText", () => {
  it("finds known skills with their canonical spelling, not partial words", () => {
    const s = skillsInText(JD);
    expect(s).toEqual(expect.arrayContaining(["Python", "PostgreSQL", "Docker", "Kubernetes", "AWS"]));
    expect(skillsInText("We use JavaScript every day")).toEqual(["JavaScript"]);
    expect(skillsInText("Javascripting is fun")).not.toContain("JavaScript");
  });
  it("ignores ordinary words that look like skills", () => {
    expect(skillsInText("We go live often. Safety first. Lean teams.")).toEqual([]);
  });
});

describe("levelFromText", () => {
  it("prefers explicit years, then title words", () => {
    expect(levelFromText("Engineer", "needs 5+ years")).toBe("senior");
    expect(levelFromText("Engineer", "2 to 4 years of experience")).toBe("mid");
    expect(levelFromText("Engineer", "10 years")).toBe("lead");
    expect(levelFromText("Engineer", "1 year")).toBe("junior");
    expect(levelFromText("Software Intern", "")).toBe("intern");
    expect(levelFromText("Senior Engineer", "great team")).toBe("senior");
    expect(levelFromText("Engineer", "freshers welcome")).toBe("junior");
    expect(levelFromText("Engineer", "great team")).toBe("mid");
  });
});

describe("parseJd + fitReport", () => {
  const job = parseJd({ title: "Senior Backend Engineer", location: "", text: JD });
  it("reads level, remote work and skills", () => {
    expect(job.level).toBe("senior");
    expect(job.workMode).toBe("remote");
    expect(job.skills).toContain("Docker");
  });
  it("gives a score out of 100 and names what is missing from the profile", () => {
    const thin: FitProfile = { headline: "", summary: "", phone: "", location: "", skills: ["Python"], experience: [], education: [], hasResume: false };
    const r = fitReport(thin, job);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.missingSkills).toEqual(expect.arrayContaining(["PostgreSQL", "Docker", "Kubernetes", "AWS"]));
    expect(r.missingDetails.map((m) => m.id)).toEqual(expect.arrayContaining(["resume", "experience", "education"]));
  });
  it("does not score location when none was given", () => {
    const p: FitProfile = { headline: "x", summary: "x", phone: "1", location: "", skills: [], experience: [], education: [], hasResume: true };
    const onsite = parseJd({ title: "Analyst", location: "", text: "Analyse data with Excel and SQL for our team every day." });
    const loc = fitReport(p, { ...onsite, workMode: "hybrid" }).parts.find((x) => x.id === "location")!;
    expect(loc.got).toBe(loc.max);
    expect(loc.note).toMatch(/not scored/);
  });
});
