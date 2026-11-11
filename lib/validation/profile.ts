import { z } from "zod";
import { canonicalSkill } from "@/lib/skills";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s\-()]{6,18}$/, "Enter a phone number, for example +91 98430 27719")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const experienceSchema = z.object({
  title: z.string().trim().min(1, "Add the role title").max(120, "Use 120 characters or fewer"),
  company: z.string().trim().min(1, "Add the company or project").max(120, "Use 120 characters or fewer"),
  period: z.string().trim().max(60, "Use 60 characters or fewer").default(""),
  description: z.string().trim().max(800, "Use 800 characters or fewer").default(""),
});

export const educationSchema = z.object({
  school: z.string().trim().min(1, "Add the school or college").max(120, "Use 120 characters or fewer"),
  degree: z.string().trim().min(1, "Add the degree or course").max(120, "Use 120 characters or fewer"),
  year: z
    .string()
    .trim()
    .max(20, "Use 20 characters or fewer")
    .refine((v) => v === "" || /^(19|20)\d{2}(\s*[-–]\s*((19|20)\d{2}|present))?$/i.test(v), "Use a year like 2023 or a range like 2019-2023")
    .default(""),
});

/** Skills: trimmed, canonical spelling, de-duplicated ignoring case, at most 40. */
export const skillsSchema = z
  .array(z.string().trim().min(1).max(40, "Each skill must be 40 characters or fewer"))
  .max(40, "You can list up to 40 skills")
  .transform((list) => {
    const seen = new Set<string>();
    return list.map(canonicalSkill).filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120, "Use 120 characters or fewer"),
  phone: phoneField,
  location: optionalText(120, "Location"),
  headline: optionalText(160, "Headline"),
  summary: optionalText(2000, "Summary"),
  skills: skillsSchema,
  experience: z.array(experienceSchema).max(15, "You can add up to 15 roles"),
  education: z.array(educationSchema).max(10, "You can add up to 10 entries"),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileData = z.output<typeof profileSchema>;
export type ExperienceEntry = z.output<typeof experienceSchema>;
export type EducationEntry = z.output<typeof educationSchema>;

// Resume upload rules, shared by the browser pre-check and the route handler.
export const RESUME_MAX_BYTES = 2 * 1024 * 1024;
export function validateResumeFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > RESUME_MAX_BYTES) return "The resume must be 2 MB or smaller.";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "Upload a PDF file.";
  return null;
}

/** Storage-safe filename: keeps letters, digits, dot, dash and underscore. */
export const safeFileName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(-80) || "resume.pdf";
