import { describe, expect, it } from "vitest";
import { guardDecision, isProtectedPath, safeNext } from "@/lib/auth/guard";

describe("auth guard", () => {
  it("sends signed-out visitors from protected pages to sign in, remembering where they were going", () => {
    expect(guardDecision({ pathname: "/applications", isAuthed: false })).toEqual({ action: "redirect", to: "/login?next=%2Fapplications" });
    expect(guardDecision({ pathname: "/profile", search: "?tab=skills", isAuthed: false })).toEqual({ action: "redirect", to: "/login?next=%2Fprofile%3Ftab%3Dskills" });
    expect(guardDecision({ pathname: "/admin/applications", isAuthed: false }).action).toBe("redirect");
  });

  it("lets signed-out visitors browse public pages", () => {
    for (const pathname of ["/", "/jobs", "/jobs/some-job", "/login", "/register", "/compare"]) {
      expect(guardDecision({ pathname, isAuthed: false })).toEqual({ action: "allow" });
    }
  });

  it("lets signed-in users reach protected pages", () => {
    for (const pathname of ["/applications", "/applications/abc", "/profile", "/saved", "/admin/applications"]) {
      expect(guardDecision({ pathname, isAuthed: true })).toEqual({ action: "allow" });
    }
  });

  it("keeps signed-in users away from the sign-in and register pages", () => {
    expect(guardDecision({ pathname: "/login", isAuthed: true })).toEqual({ action: "redirect", to: "/jobs" });
    expect(guardDecision({ pathname: "/register", isAuthed: true, next: "/applications" })).toEqual({ action: "redirect", to: "/applications" });
  });

  it("matches path prefixes on segment boundaries only", () => {
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/profile/edit")).toBe(true);
    expect(isProtectedPath("/profiles")).toBe(false);
    expect(isProtectedPath("/applications-guide")).toBe(false);
  });
});

describe("safeNext (open-redirect protection)", () => {
  it("accepts same-site relative paths", () => {
    expect(safeNext("/applications")).toBe("/applications");
    expect(safeNext("/jobs?q=react&mode=remote")).toBe("/jobs?q=react&mode=remote");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "applications", "", null, undefined])("rejects %s", (bad) => {
    expect(safeNext(bad as string | null | undefined)).toBe("/jobs");
  });

  it("does not loop back to the auth pages", () => {
    expect(safeNext("/login?next=/profile")).toBe("/jobs");
    expect(safeNext("/register")).toBe("/jobs");
  });
});
