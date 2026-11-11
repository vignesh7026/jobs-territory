// Pure routing rules for authentication, kept free of Next.js and Supabase so they are easy to test.

/** Where signed-in users land by default. */
export const AFTER_LOGIN = "/jobs";

const PROTECTED_PREFIXES = ["/applications", "/profile", "/saved", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

const matchesPrefix = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

export const isProtectedPath = (pathname: string) => PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p));
export const isAuthPage = (pathname: string) => AUTH_PAGES.some((p) => matchesPrefix(pathname, p));

/**
 * Only same-site relative paths are allowed as a post-login target.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslash tricks and loops back to the auth pages.
 */
export function safeNext(next: string | null | undefined, fallback: string = AFTER_LOGIN): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "http://placeholder.local");
    if (url.origin !== "http://placeholder.local") return fallback;
    if (isAuthPage(url.pathname)) return fallback;
  } catch {
    return fallback;
  }
  return next;
}

export type GuardDecision = { action: "allow" } | { action: "redirect"; to: string };

export function guardDecision(input: { pathname: string; search?: string; isAuthed: boolean; next?: string | null }): GuardDecision {
  const { pathname, search = "", isAuthed, next } = input;
  if (!isAuthed && isProtectedPath(pathname)) {
    return { action: "redirect", to: `/login?next=${encodeURIComponent(pathname + search)}` };
  }
  if (isAuthed && isAuthPage(pathname)) {
    return { action: "redirect", to: safeNext(next) };
  }
  return { action: "allow" };
}
