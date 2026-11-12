"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { ruleSchema } from "@/lib/auto-apply";
import { runAutoApply } from "@/lib/auto-apply-run";
import { getMatchProfile } from "@/lib/profile/queries";
import { quickApplyReadiness } from "@/lib/quick-apply";
import { createClient } from "@/lib/supabase/server";

export type RuleResult =
  | { ok: true; applied: number; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function refresh() {
  revalidatePath("/auto-apply");
  revalidatePath("/applications");
}

/** Save the rule, turn it on, and run it once straight away. The consent box is required every time the rule changes. */
export async function saveRule(input: unknown): Promise<RuleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }
  const profile = await getMatchProfile(user.id);
  if (!profile) return { ok: false, message: "Complete your profile first." };
  const ready = quickApplyReadiness({ skills: profile.skills, hasResume: profile.hasResume, hasExperience: profile.hasExperience });
  if (!ready.ready) return { ok: false, message: ready.reason };

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("auto_apply_rules").upsert(
    {
      candidate_id: user.id, roles: v.roles, locations: v.locations, include_remote: v.includeRemote, min_match: v.minMatch,
      daily_cap: v.dailyCap, verified_only: v.verifiedOnly, enabled: true, last_run_at: null, updated_at: new Date().toISOString(),
    },
    { onConflict: "candidate_id" },
  );
  if (error) return { ok: false, message: "We could not save your rule. Try again." };

  const run = await runAutoApply(supabase, user.id, profile, { force: true });
  refresh();
  const n = run.applied.length;
  return { ok: true, applied: n, message: n === 0 ? "Auto-apply is on. Nothing matches right now; new matches are applied to when you next visit." : `Auto-apply is on. Applied to ${n} ${n === 1 ? "job" : "jobs"} just now.` };
}

export async function setEnabled(enabled: boolean): Promise<RuleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("auto_apply_rules").update({ enabled, updated_at: new Date().toISOString() }).eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not change that. Try again." };
  refresh();
  return { ok: true, applied: 0, message: enabled ? "Auto-apply resumed." : "Auto-apply paused. Nothing more will be sent." };
}

export async function runNow(): Promise<RuleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const profile = await getMatchProfile(user.id);
  if (!profile) return { ok: false, message: "Complete your profile first." };
  const supabase = await createClient();
  const run = await runAutoApply(supabase, user.id, profile, { force: true });
  if (!run.ran) return { ok: false, message: run.reason ?? "Nothing was sent." };
  refresh();
  const n = run.applied.length;
  return { ok: true, applied: n, message: n === 0 ? "Checked: no new matching jobs, or today's limit is reached." : `Applied to ${n} ${n === 1 ? "job" : "jobs"}.` };
}

export async function removeRule(): Promise<RuleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("auto_apply_rules").delete().eq("candidate_id", user.id);
  if (error) return { ok: false, message: "We could not remove it. Try again." };
  refresh();
  return { ok: true, applied: 0, message: "Rule removed. Applications already sent stay in your list." };
}
