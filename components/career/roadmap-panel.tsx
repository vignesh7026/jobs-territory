"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { clearPlan, setItemDone, startPlan } from "@/app/(app)/career/actions";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi } from "@/components/ai/use-ai";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RoadmapItem } from "@/lib/career-queries";
import { progress, resourceFor, type PlanWeek } from "@/lib/roadmap";

interface JobOption {
  id: string;
  slug: string;
  title: string;
  company: string;
}

function groupByWeek<T extends { week: number }>(items: T[]): [number, T[]][] {
  const m = new Map<number, T[]>();
  for (const i of items) m.set(i.week, [...(m.get(i.week) ?? []), i]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

/** Builder (pick a role, draft a plan) and tracker (tick tasks off). The plan is yours: it lives on your account only. */
export function RoadmapPanel({ jobs, initialSlug, items }: { jobs: JobOption[]; initialSlug: string | null; items: RoadmapItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [slug, setSlug] = useState(initialSlug && jobs.some((j) => j.slug === initialSlug) ? initialSlug : (jobs[0]?.slug ?? ""));
  const [weeks, setWeeks] = useState(6);
  const [plan, setPlan] = useState<PlanWeek[] | null>(null);
  const [source, setSource] = useState<"ai" | "plain">("plain");
  const [busy, setBusy] = useState<"idle" | "drafting" | "saving">("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, i.done])));
  const [, startTransition] = useTransition();

  const job = jobs.find((j) => j.slug === slug);
  const current = useMemo(() => items.map((i) => ({ ...i, done: done[i.id] ?? i.done })), [items, done]);
  const prog = progress(current);

  async function draft() {
    if (!job) return;
    setBusy("drafting");
    setError("");
    try {
      const r = await postAi<{ weeks: PlanWeek[] }>("roadmap", { jobId: job.id, weeks });
      setPlan(r.data.weeks);
      setSource(isAi(r.source) ? "ai" : "plain");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    }
    setBusy("idle");
  }

  async function start() {
    if (!job || !plan) return;
    setBusy("saving");
    const r = await startPlan({ target: `${job.title} at ${job.company}`, weeks: plan });
    setBusy("idle");
    if (r.ok) {
      setPlan(null);
      toast({ title: "Plan started", description: "Tick tasks off as you finish them.", tone: "success" });
      router.refresh();
    } else setError(r.message);
  }

  function toggle(id: string, value: boolean) {
    setDone((d) => ({ ...d, [id]: value }));
    startTransition(async () => {
      const r = await setItemDone(id, value);
      if (!r.ok) {
        setDone((d) => ({ ...d, [id]: !value }));
        toast({ title: r.message, tone: "error" });
      } else router.refresh();
    });
  }

  async function remove() {
    const r = await clearPlan();
    if (r.ok) {
      toast({ title: "Plan removed" });
      router.refresh();
    } else toast({ title: r.message, tone: "error" });
  }

  return (
    <div className="grid gap-6" id="plan">
      {current.length > 0 && (
        <Card className="p-5" data-testid="tracker">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base">Your plan: {items[0].target}</h3>
              <p className="mt-0.5 text-sm text-muted tabular-nums" data-testid="progress">
                {prog.done} of {prog.total} tasks done
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={remove}>
              Remove plan
            </Button>
          </div>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <span className="block h-full origin-left rounded-full bg-primary transition-transform duration-base ease-out" style={{ transform: `scaleX(${prog.percent / 100})` }} />
          </span>
          <div className="mt-5 grid gap-5">
            {groupByWeek(current).map(([week, tasks]) => (
              <section key={week} aria-labelledby={`wk-${week}`}>
                <h4 id={`wk-${week}`} className="text-sm font-semibold">
                  Week {week}: {tasks[0].skill}
                </h4>
                <ul className="mt-2 grid gap-1">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-primary-soft md:min-h-9">
                        <input type="checkbox" checked={t.done} onChange={(e) => toggle(t.id, e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                        <span className={t.done ? "text-muted line-through" : ""}>{t.task}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <a href={tasks[0].resourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex min-h-9 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
                  <ExternalLink className="size-4" aria-hidden="true" /> {tasks[0].resourceTitle}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </section>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-base">{current.length > 0 ? "Start a different plan" : "Plan your way to a role"}</h3>
        <p className="mt-1 text-sm text-muted">Pick a role you want. We compare it with your profile and draft a week-by-week plan to close the gap. Starting a new plan replaces the current one.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="grid gap-1.5">
            <label htmlFor="role" className="text-sm font-medium">
              Target role
            </label>
            <select id="role" value={slug} onChange={(e) => { setSlug(e.target.value); setPlan(null); }} className="h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10">
              {jobs.map((j) => (
                <option key={j.id} value={j.slug}>
                  {j.title} - {j.company}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="weeks" className="text-sm font-medium">
              Length
            </label>
            <select id="weeks" value={weeks} onChange={(e) => { setWeeks(Number(e.target.value)); setPlan(null); }} className="h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10">
              {[4, 6, 8].map((w) => (
                <option key={w} value={w}>
                  {w} weeks
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={draft} disabled={busy !== "idle" || !job}>
            {busy === "drafting" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {busy === "drafting" ? "Drafting" : "Draft a plan"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger-fg">
            {error}
          </p>
        )}

        {plan && (
          <div className="mt-5 border-t border-border pt-5" data-testid="draft-plan">
            <ol className="grid gap-4">
              {plan.map((w) => (
                <li key={w.week}>
                  <p className="text-sm font-semibold">
                    Week {w.week}: {w.skill}
                  </p>
                  <ul className="mt-1 grid gap-1 pl-5 text-sm [&>li]:list-disc [&>li]:marker:text-muted">
                    {w.tasks.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <a href={resourceFor(w.skill).url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
                    <ExternalLink className="size-4" aria-hidden="true" /> {resourceFor(w.skill).title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" onClick={start} disabled={busy !== "idle"}>
                {busy === "saving" ? "Saving" : "Start this plan"}
              </Button>
              {source === "ai" ? <AiTag label="Plan drafted by AI. Links are from a fixed list." /> : <span className="text-xs text-muted">Standard plan from your skill gap (AI is unavailable right now).</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
