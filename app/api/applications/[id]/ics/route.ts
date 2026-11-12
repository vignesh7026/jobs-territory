import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getApplication } from "@/lib/applications/queries";
import { buildIcs } from "@/lib/ics";

/** GET /api/applications/:id/ics -> a calendar file for the candidate's own interview. 401 | 404. */
export async function GET(_req: Request, ctx: RouteContext<"/api/applications/[id]/ics">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const app = await getApplication(id);
  if (!app || app.candidateId !== user.id || !app.interviewAt) return NextResponse.json({ error: "No interview time is set." }, { status: 404 });

  const body = buildIcs({
    uid: app.id,
    title: `Interview: ${app.job.title} at ${app.job.company}`,
    start: new Date(app.interviewAt),
    description: `Interview for ${app.job.title} at ${app.job.company}. Prepare with a mock interview in Jobs Territory.`,
    location: app.job.location,
  });
  return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="interview.ics"', "Cache-Control": "private, no-store" } });
}
