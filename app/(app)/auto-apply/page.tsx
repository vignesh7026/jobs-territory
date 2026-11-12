import type { Metadata } from "next";
import { AutoApplyPanel, type PanelSent } from "@/components/auto-apply/auto-apply-panel";
import { requireUser } from "@/lib/auth/session";
import { canUndoApplication, remainingToday } from "@/lib/auto-apply";
import { getRule, previewMatches, runAutoApply, sentLast24h } from "@/lib/auto-apply-run";
import { timeAgo } from "@/lib/format";
import { getMatchProfile } from "@/lib/profile/queries";
import { quickApplyReadiness } from "@/lib/quick-apply";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Auto-apply" };

export default async function AutoApplyPage() {
  const user = await requireUser("/auto-apply");
  const supabase = await createClient();
  const mp = await getMatchProfile(user.id);
  const readiness = mp ? quickApplyReadiness({ skills: mp.skills, hasResume: mp.hasResume, hasExperience: mp.hasExperience }) : { ready: false as const, reason: "Complete your profile first." };

  // Opening this page is one of the moments the rule is checked (at most every 30 minutes).
  if (mp) await runAutoApply(supabase, user.id, mp);
  const rule = await getRule(supabase, user.id);

  const last24 = await sentLast24h(supabase, user.id);
  const [{ data: rows }, preview] = await Promise.all([
    supabase.from("applications").select("id, status, created_at, jobs(slug, title, companies(name))").eq("candidate_id", user.id).eq("auto_applied", true).order("created_at", { ascending: false }).limit(10),
    rule && mp ? previewMatches(supabase, user.id, rule, mp) : Promise.resolve({ picks: [], remaining: 0 }),
  ]);

  const sent: PanelSent[] = (rows ?? []).flatMap((r) => {
    const j = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
    if (!j) return [];
    const co = Array.isArray(j.companies) ? j.companies[0] : j.companies;
    return [{ id: r.id, slug: j.slug, title: j.title, company: co?.name ?? "Unknown company", when: timeAgo(r.created_at), canUndo: canUndoApplication(r.status, r.created_at) }];
  });

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Auto-apply</h1>
      <p className="mb-8 mt-2 max-w-prose text-muted">
        Choose the roles and places you want. We apply for you to matching jobs, within the limits you set, and list every one below so you can undo it.
      </p>
      <AutoApplyPanel
        rule={rule}
        notReady={readiness.ready ? null : readiness.reason}
        picks={preview.picks.map((p) => ({ slug: p.job.slug, title: p.job.title, company: p.job.company, location: p.job.location, score: p.score }))}
        remainingToday={rule ? remainingToday(rule.dailyCap, last24) : 0}
        sent={sent}
      />
    </section>
  );
}
