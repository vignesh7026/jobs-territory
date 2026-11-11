import type { ZodError } from "zod";

/** Every issue keyed by its full dotted path ("experience.0.title"), first message per path wins. */
export function pathErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
