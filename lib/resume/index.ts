import { extractText, parseResume } from "./parser";
import { pdfToText } from "./pdf-text";

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

const isPdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
const tidy = (t: string) => t.replace(/\r/g, "").replace(/[ \t ]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const NO_TEXT = "No readable text found. Scanned or image-only resumes cannot be read automatically.";

/**
 * Read a resume file's text and pull profile fields out of it. Never throws: a bad file is an `error` message.
 * PDFs go through pdf.js first (accurate on real-world fonts); the simple built-in reader is the fallback, and the
 * only reader for plain text and Word files.
 */
export async function readResume(bytes: Uint8Array, filename: string): Promise<ReadResult> {
  try {
    let text = "";
    if (isPdf(bytes)) {
      try {
        text = tidy(await pdfToText(bytes));
      } catch {
        text = "";
      }
    }
    if (text.length < 40) {
      const fallback = extractText(Buffer.from(bytes), filename) as { text: string; error?: string };
      if (fallback.error && fallback.text.length < 40) return { ok: false, error: isPdf(bytes) ? NO_TEXT : fallback.error };
      text = fallback.text;
    }
    const { fields, email, name } = parseResume(text) as { fields: ParsedResume; email: string; name: string };
    return { ok: true, parsed: fields, name, email };
  } catch {
    return { ok: false, error: "We could not read this resume automatically." };
  }
}
