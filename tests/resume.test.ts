import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readResume } from "@/lib/resume";
import { fillFromResume, type FillableProfile } from "@/lib/resume/to-profile";
import { RESUME_TEXT, makePdf } from "./fixtures/resume-sample";

const empty: FillableProfile = { fullName: "", phone: "", location: "", headline: "", githubUsername: "", summary: "", skills: [], experience: [], education: [] };

describe("readResume (PDF)", () => {
  const r = readResume(makePdf(RESUME_TEXT), "resume.pdf");
  if (!r.ok) throw new Error(r.error);
  const p = r.parsed;

  it("finds name, email, phone, location and headline", () => {
    expect(r.name).toBe("Karthik Raman");
    expect(r.email).toBe("karthik.raman@example.com");
    expect(p.phone).toBe("+91 98430 27719");
    expect(p.location).toBe("Coimbatore, Tamil Nadu");
    expect(p.headline).toBe("Frontend Developer");
  });
  it("reads the summary and the listed skills, without domain words from the prose", () => {
    expect(p.bio).toContain("accessible React interfaces");
    expect(p.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "JavaScript", "Node.js", "Tailwind CSS", "Jest", "Git"]));
    expect(p.skills).not.toContain("Logistics");
  });
  it("reads roles with company, period and what was done", () => {
    expect(p.experience).toHaveLength(2);
    expect(p.experience[0]).toMatchObject({ title: "Frontend Developer", company: "Orchard Cloud", period: "Jun 2023 - Present" });
    expect(p.experience[0].description).toContain("billing dashboard");
    expect(p.experience[1]).toMatchObject({ title: "Web Developer Intern", company: "Brightwell Labs" });
  });
  it("reads education and links", () => {
    expect(p.education[0]).toMatchObject({ degree: "B.E. Computer Science and Engineering", year: "2023" });
    expect(p.education[0].school).toContain("PSG College of Technology");
    expect(p.links.github).toBe("https://github.com/karthikraman");
    expect(p.links.linkedin).toContain("linkedin.com/in/karthik-raman");
    expect(p.experienceYears).toBe(3);
  });
});

describe("readResume edge cases", () => {
  it("reads a compressed (FlateDecode) PDF stream too", () => {
    const text = ["BT", "/F1 11 Tf", "72 760 Td", ...RESUME_TEXT.split("\n").map((l) => `0 -14 Td (${l.replace(/[()\\]/g, "")}) Tj`), "ET"].join("\n");
    const data = deflateSync(Buffer.from(text, "latin1"));
    const head = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, "latin1");
    const tail = Buffer.from("\nendstream\nendobj\n%%EOF\n", "latin1");
    const r = readResume(new Uint8Array(Buffer.concat([head, data, tail])), "resume.pdf");
    expect(r.ok && r.parsed.skills.includes("React")).toBe(true);
  });
  it("says so for a PDF with no text layer (a scan)", () => {
    const r = readResume(new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Subtype /Image >>\nstream\nxxxx\nendstream\nendobj\n%%EOF"), "scan.pdf");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/No readable text/);
  });
  it("never throws on garbage", () => {
    expect(readResume(new Uint8Array([0, 1, 2, 3, 250, 251]), "x.bin").ok).toBe(false);
    expect(readResume(new TextEncoder().encode("%PDF-1.4 broken"), "a.pdf").ok).toBe(false);
  });
  it("reads a plain-text resume as well", () => {
    const r = readResume(new TextEncoder().encode(RESUME_TEXT), "resume.txt");
    expect(r.ok && r.name).toBe("Karthik Raman");
  });
});

describe("fillFromResume", () => {
  const r = readResume(makePdf(RESUME_TEXT), "resume.pdf");
  if (!r.ok) throw new Error(r.error);

  it("fills an empty profile with everything it found", () => {
    const { values, filled } = fillFromResume(empty, r.parsed, r.name);
    expect(values.fullName).toBe("Karthik Raman");
    expect(values.phone).toBe("+91 98430 27719");
    expect(values.headline).toBe("Frontend Developer");
    expect(values.githubUsername).toBe("karthikraman");
    expect(values.skills).toContain("React");
    expect(values.experience).toHaveLength(2);
    expect(values.education).toHaveLength(1);
    expect(filled).toEqual(expect.arrayContaining(["phone", "location", "headline", "summary", "2 roles", "1 education entry"]));
  });

  it("never overwrites what the person already wrote", () => {
    const mine: FillableProfile = {
      ...empty, fullName: "Karthik R", headline: "My own headline", summary: "My own summary", phone: "+91 90000 11111",
      skills: ["react", "Python"], experience: [{ title: "Mine", company: "Mine Co", period: "", description: "" }],
    };
    const { values } = fillFromResume(mine, r.parsed, r.name);
    expect(values.fullName).toBe("Karthik R");
    expect(values.headline).toBe("My own headline");
    expect(values.summary).toBe("My own summary");
    expect(values.phone).toBe("+91 90000 11111");
    expect(values.experience).toEqual(mine.experience);
    // skills are added, not replaced, and "react" is not duplicated as "React"
    expect(values.skills.filter((s) => s.toLowerCase() === "react")).toHaveLength(1);
    expect(values.skills).toContain("Python");
    expect(values.skills).toContain("TypeScript");
  });

  it("caps skills at 40, drops an invalid phone, and fills a missing company with a plain placeholder", () => {
    const many = { ...r.parsed, phone: "call me maybe", skills: Array.from({ length: 60 }, (_, i) => `Skill${i}`), experience: [{ title: "Dev", company: "", period: "", description: "" }] };
    const { values } = fillFromResume(empty, many);
    expect(values.skills).toHaveLength(40);
    expect(values.phone).toBe("");
    expect(values.experience[0].company).toBe("Company not listed");
  });

  it("running it twice changes nothing the second time", () => {
    const once = fillFromResume(empty, r.parsed, r.name);
    const twice = fillFromResume(once.values, r.parsed, r.name);
    expect(twice.values).toEqual(once.values);
    expect(twice.filled).toEqual([]);
  });
});
