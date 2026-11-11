import { NextResponse } from "next/server";
import { undoApplication } from "@/lib/applications/apply";
import { createClient } from "@/lib/supabase/server";

/** DELETE /api/applications/:id  ->  200 | 401 | 404 | 409. This is the "Undo" on the apply confirmation. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const result = await undoApplication(supabase, id);
  if (result.status === 200) return NextResponse.json({ ok: true });
  const { status, ...rest } = result;
  return NextResponse.json(rest, { status });
}
