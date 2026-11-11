import { describe, expect, it } from "vitest";
import { profileStrength } from "@/lib/profile-strength";
import { profileSchema, safeFileName, validateResumeFile } from "@/lib/validation/profile";

const empty = { skills: [], experienceCount: 0, educationCount: 0, hasResume: false };

describe("profileStrength", () => {
  it("scores an empty profile 0 and names the resume as the biggest win", () => {
    const r = profileStrength(empty);
    expect(r.score).toBe(0);
    expect(r.next?.key).toBe("resume");
  });

  it("scores a complete profile 100 with nothing left to do", () => {
    const r = profileStrength({
      headline: "Full stack developer",
      summary: "x".repeat(150),
      phone: "+91 98430 27719",
      location: "Coimbatore",
      skills: ["a", "b", "c", "d", "e", "f", "g"],
      experienceCount: 2,
      educationCount: 1,
      hasResume: true,
    });
    expect(r.score).toBe(100);
    expect(r.next).toBeNull();
  });

  it("gives partial credit for skills and recommends the largest remaining gain", () => {
    const r = profileStrength({ ...empty, hasResume: true, skills: ["SQL", "Git"], headline: "x", phone: "1", location: "x", educationCount: 1, experienceCount: 1, summary: "y".repeat(120) });
    expect(r.items.find((i) => i.key === "skills")?.earned).toBe(7); // 2/6 of 20
    expect(r.next?.key).toBe("skills");
    expect(r.next?.action).toMatch(/Add 4 more skills/);
  });

  it("uses singular wording when one skill is missing", () => {
    const r = profileStrength({ ...empty, skills: ["a", "b", "c", "d", "e"] });
    expect(r.items.find((i) => i.key === "skills")?.action).toMatch(/Add 1 more skill /);
  });
});

describe("profile validation", () => {
  const base = { fullName: "Meera Krishnan", phone: "", location: "", headline: "", summary: "", skills: [], experience: [], education: [] };

  it("turns empty optional text into null so the database stays clean", () => {
    const r = profileSchema.parse(base);
    expect(r.phone).toBeNull();
    expect(r.summary).toBeNull();
  });

  it("canonicalises and de-duplicates skills ignoring case", () => {
    const r = profileSchema.parse({ ...base, skills: ["typescript", "TypeScript", " react ", "Obscure Tool"] });
    expect(r.skills).toEqual(["TypeScript", "React", "Obscure Tool"]);
  });

  it("rejects bad phone numbers and years with plain-language messages", () => {
    const r = profileSchema.safeParse({ ...base, phone: "call me", education: [{ school: "PSG", degree: "B.E.", year: "last year" }] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("Enter a phone number, for example +91 98430 27719");
      expect(msgs).toContain("Use a year like 2023 or a range like 2019-2023");
    }
  });

  it("accepts years and ranges", () => {
    for (const year of ["2023", "2019-2023", "2019 - 2023", "2022-present", ""]) {
      expect(profileSchema.safeParse({ ...base, education: [{ school: "PSG", degree: "B.E.", year }] }).success).toBe(true);
    }
  });

  it("limits list sizes", () => {
    const many = Array.from({ length: 16 }, (_, i) => ({ title: `Role ${i}`, company: "Co", period: "", description: "" }));
    expect(profileSchema.safeParse({ ...base, experience: many }).success).toBe(false);
  });
});

describe("resume file rules", () => {
  it("accepts a normal PDF", () => expect(validateResumeFile({ name: "cv.pdf", size: 400_000, type: "application/pdf" })).toBeNull());
  it("rejects files over 2 MB", () => expect(validateResumeFile({ name: "cv.pdf", size: 2 * 1024 * 1024 + 1, type: "application/pdf" })).toMatch(/2 MB/));
  it("rejects non-PDFs", () => expect(validateResumeFile({ name: "cv.docx", size: 1000, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toMatch(/PDF/));
  it("rejects empty files", () => expect(validateResumeFile({ name: "cv.pdf", size: 0, type: "application/pdf" })).toMatch(/empty/));
  it("makes storage-safe file names", () => {
    expect(safeFileName("Meera K — CV (final).pdf")).toBe("Meera_K_CV_final_.pdf");
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("")).toBe("resume.pdf");
  });
});

import { allowedNext, canMove, isTerminal, isUndoable } from "@/lib/applications/status";

describe("application status rules", () => {
  it("allows only the forward step or rejection", () => {
    expect(allowedNext("applied")).toEqual(["under_review", "rejected"]);
    expect(canMove("under_review", "shortlisted")).toBe(true);
    expect(canMove("under_review", "interview")).toBe(false); // cannot skip a stage
    expect(canMove("interview", "applied")).toBe(false); // cannot go backwards
    expect(canMove("offered", "rejected")).toBe(true); // an offer can still be withdrawn
  });
  it("treats rejected as final", () => {
    expect(isTerminal("rejected")).toBe(true);
    expect(allowedNext("rejected")).toEqual([]);
    expect(isTerminal("offered")).toBe(false);
  });
  it("lets a candidate withdraw only an untouched, recent application", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(isUndoable("applied", "2026-11-11T11:55:00Z", now)).toBe(true);
    expect(isUndoable("applied", "2026-11-11T11:49:00Z", now)).toBe(false); // 11 minutes
    expect(isUndoable("under_review", "2026-11-11T11:59:00Z", now)).toBe(false);
  });
});
