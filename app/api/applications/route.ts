import { NextResponse } from "next/server";
import { applyToJob } from "@/lib/applications/apply";
import { createClient } from "@/lib/supabase/server";

/** POST /api/applications  { jobId, coverNote? }  ->  201 | 400 | 401 | 404 | 409 "Already applied" | 410 | 500 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the application as JSON." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await applyToJob(supabase, body);
  if (result.status === 201) return NextResponse.json(result.application, { status: 201 });
  const { status, ...rest } = result;
  return NextResponse.json(rest, { status });
}
