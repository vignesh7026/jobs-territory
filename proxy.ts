import { NextResponse, type NextRequest } from "next/server";
import { guardDecision } from "@/lib/auth/guard";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: this file replaces middleware.ts. It refreshes the session and does optimistic redirects only.
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const { response, isAuthed } = await updateSession(request, { verify: pathname === "/login" || pathname === "/register" });

  const decision = guardDecision({ pathname, search, isAuthed, next: searchParams.get("next") });
  if (decision.action === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // keep any refreshed auth cookies
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
