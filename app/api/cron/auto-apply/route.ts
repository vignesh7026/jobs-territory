import { NextResponse } from "next/server";
import { runAutoApply } from "@/lib/auto-apply-run";
import { matchProfileFrom } from "@/lib/profile/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time comparison so the secret cannot be guessed byte by byte. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/auto-apply  (header "Authorization: Bearer <CRON_SECRET>")
 * Runs every enabled auto-apply rule, each under its own limits (match floor, daily cap, verified only, no stale
 * listings). Vercel Cron sends the header automatically when CRON_SECRET is set. 503 if the secret is not configured,
 * 401 for a wrong one, so the endpoint is never open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!sameSecret(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = createAdminClient();
  const { data: rules, error } = await db.from("auto_apply_rules").select("candidate_id").eq("enabled", true).limit(500);
  if (error) return NextResponse.json({ error: "Could not load rules." }, { status: 500 });

  let candidates = 0;
  let applied = 0;
  let failed = 0;
  for (const r of rules ?? []) {
    try {
      const profile = await matchProfileFrom(db, r.candidate_id);
      if (!profile) continue;
      const run = await runAutoApply(db, r.candidate_id, profile, { service: true });
      if (run.ran) {
        candidates++;
        applied += run.applied.length;
      }
    } catch {
      failed++; // one candidate's problem never stops the others
    }
  }
  return NextResponse.json({ rules: rules?.length ?? 0, ran: candidates, applied, failed });
}
