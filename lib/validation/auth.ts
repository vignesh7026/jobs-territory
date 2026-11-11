import { z } from "zod";

// Shared by the browser (validate on blur) and the server action (the real check).
export const emailField = z.string().trim().min(1, "Enter your email address").pipe(z.email("Enter a valid email address, like name@example.com"));

export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const nameField = z.string().trim().min(2, "Enter your full name").max(120, "Use 120 characters or fewer");

export const registerSchema = z.object({ fullName: nameField, email: emailField, password: passwordField });
export const loginSchema = z.object({ email: emailField, password: z.string().min(1, "Enter your password") });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** First error message per field, in the shape forms need. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
