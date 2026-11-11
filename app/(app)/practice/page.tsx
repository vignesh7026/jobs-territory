import type { Metadata } from "next";
import Link from "next/link";
import { CompanyMark } from "@/components/jobs/job-row";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Practice interviews" };

interface Pick {
  slug: string;
  title: string;
  company: string;
  why: string;
}

const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function PracticePage() {
  const user = await requireUser("/practice");
  const supabase = await createClient();
  const [apps, saved] = await Promise.all([
    supabase.from("applications").select("status, jobs(slug, title, companies(name))").eq("candidate_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("saved_jobs").select("jobs(slug, title, companies(name))").eq("candidate_id", user.id).order("created_at", { ascending: false }),
  ]);

  const picks = new Map<string, Pick>();
  const add = (job: { slug: string; title: string; companies: { name: string } | { name: string }[] | null } | null, why: string) => {
    if (!job || picks.has(job.slug)) return;
    picks.set(job.slug, { slug: job.slug, title: job.title, company: first(job.companies)?.name ?? "", why });
  };
  // Interviews first: that is when practice matters most.
  const rows = (apps.data ?? []).map((a) => ({ status: a.status, job: first(a.jobs) }));
  for (const r of rows.filter((r) => r.status === "interview" || r.status === "shortlisted")) add(r.job, r.status === "interview" ? "Interview stage" : "Shortlisted");
  for (const r of rows) add(r.job, "You applied");
  for (const s of saved.data ?? []) add(first(s.jobs), "Saved");
  const list = [...picks.values()];

  return (
    <section className="container max-w-3xl py-8 md:py-10">
      <h1 className="text-3xl">Practice interviews</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">Pick a job. You get five questions for that role, two minutes each, with a score for clarity, structure and specificity after every answer.</p>
      {list.length === 0 ? (
        <Card className="p-6 text-sm">
          You have not applied to or saved any jobs yet. Open any job and choose <span className="font-medium">Practise the interview</span>, or{" "}
          <Link href="/jobs" className="font-medium text-primary underline-offset-4 hover:underline">
            browse jobs
          </Link>
          .
        </Card>
      ) : (
        <ul className="grid gap-3">
          {list.map((p) => (
            <li key={p.slug}>
              <Link href={`/practice/${p.slug}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-shadow duration-fast hover:shadow-soft">
                <CompanyMark name={p.company} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.title}</span>
                  <span className="block truncate text-xs text-muted">{p.company}</span>
                </span>
                <span className="text-xs text-muted">{p.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
