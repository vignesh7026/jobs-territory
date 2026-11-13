import { extractText, parseResume } from "./parser";

export interface ParsedResume {
  headline: string;
  phone: string;
  location: string;
  bio: string;
  skills: string[];
  experienceYears: number;
  education: { school: string; degree: string; year: string }[];
  experience: { title: string; company: string; period: string; description: string }[];
  links: { linkedin: string; github: string; portfolio: string };
}

export type ReadResult =
  | { ok: true; parsed: ParsedResume; name: string; email: string }
  | { ok: false; error: string };

/** Read a resume file's text and pull profile fields out of it. Never throws: a bad file is an `error` message. */
export function readResume(bytes: Uint8Array, filename: string): ReadResult {
  try {
    const { text, error } = extractText(Buffer.from(bytes), filename) as { text: string; error?: string };
    if (error) return { ok: false, error };
    const { fields, email, name } = parseResume(text) as { fields: ParsedResume; email: string; name: string };
    return { ok: true, parsed: fields, name, email };
  } catch {
    return { ok: false, error: "We could not read this resume automatically." };
  }
}
