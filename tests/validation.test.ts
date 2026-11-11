import { describe, expect, it } from "vitest";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation/auth";

describe("registration validation", () => {
  const ok = { fullName: "Meera Krishnan", email: "meera@example.com", password: "river-stone-42" };

  it("accepts a valid registration and trims the name and email", () => {
    const r = registerSchema.safeParse({ ...ok, fullName: "  Meera Krishnan ", email: " meera@example.com " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ fullName: "Meera Krishnan", email: "meera@example.com" });
  });

  it("explains each problem in plain language, per field", () => {
    const r = registerSchema.safeParse({ fullName: "A", email: "not-an-email", password: "short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.fullName).toBe("Enter your full name");
      expect(errs.email).toMatch(/valid email/);
      expect(errs.password).toBe("Use at least 8 characters");
    }
  });

  it("requires a letter and a number in the password", () => {
    expect(registerSchema.safeParse({ ...ok, password: "12345678" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "abcdefg1" }).success).toBe(true);
  });
});

describe("login validation", () => {
  it("does not apply password-strength rules when signing in", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
