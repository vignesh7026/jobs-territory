import { NextResponse } from "next/server";
import { listMyApplications } from "@/lib/applications/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { listSavedSearches } from "@/lib/saved/queries";

/** The personal items the command palette offers: saved searches and applications. Signed-out visitors get empty lists. */
export async function GET() {
  const user = await getCurrentUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) return NextResponse.json({ savedSearches: [], applications: [] }, { headers });

  const [searches, apps] = await Promise.all([listSavedSearches(user.id).catch(() => []), listMyApplications(user.id).catch(() => [])]);
  return NextResponse.json(
    {
      savedSearches: searches.slice(0, 8).map((s) => ({ id: s.id, name: s.name, href: s.href })),
      applications: apps.slice(0, 8).map((a) => ({ id: a.id, title: a.job.title, company: a.job.company })),
    },
    { headers },
  );
}
