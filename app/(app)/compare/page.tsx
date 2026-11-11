import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Award, Check, Minus, Scale, X } from "lucide-react";
import { CompanyMark } from "@/components/jobs/job-row";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_COMPARE, bestIndexes, parseCompareIds } from "@/lib/compare";
import { getJobsForCompare } from "@/lib/compare-queries";
import { daysUntil, formatSalary, timeAgo } from "@/lib/format";
import { LEVEL_LABELS, MODE_LABELS, TYPE_LABELS } from "@/lib/jobs/filters";
import { computeMatch } from "@/lib/match";
import { getMatchProfile } from "@/lib/profile/queries";
import { skillKey } from "@/lib/skills";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare jobs" };

function Best() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success-fg">
      <Award className="size-3" aria-hidden="true" /> Highest
    </span>
  );
}

export default async function ComparePage(props: PageProps<"/compare">) {
  const sp = await props.searchParams;
  const ids = parseCompareIds(sp.ids);
  const jobs = await getJobsForCompare(ids);
  const missing = ids.length - jobs.length;

  if (jobs.length < 2) {
    return (
      <section className="container py-8 md:py-10">
        <h1 className="text-3xl">Compare jobs</h1>
        <div className="mt-6">
          <EmptyState
            icon={<Scale />}
            title={jobs.length === 1 ? "Pick one more job" : "Pick two or three jobs to compare"}
            description={missing > 0 ? "Some of the jobs in this link no longer exist. Pick others from the list." : "On the jobs list, use the scale icon on a job to add it. Then open the comparison from the tray at the bottom."}
          >
            <Link href="/jobs" className={buttonVariants({ variant: "primary" })}>
              Browse jobs
            </Link>
          </EmptyState>
        </div>
      </section>
    );
  }

  const user = await getCurrentUser();
  const mp = await getMatchProfile(user?.id ?? null);
  const matches = mp ? jobs.map((j) => computeMatch(mp, { skills: j.skills, level: j.level, workMode: j.workMode, location: j.location, title: j.title })) : null;
  const mine = new Set((mp?.skills ?? []).map(skillKey));

  const bestPay = bestIndexes(jobs.map((j) => j.salaryMaxInr));
  const bestMatch = matches ? bestIndexes(matches.map((m) => m.score)) : [];
  const currencies = new Set(jobs.map((j) => j.currency));
  const without = (id: string) => `/compare?ids=${jobs.filter((j) => j.id !== id).map((j) => j.id).join(",")}`;
  const nextUrl = `/compare?ids=${ids.join(",")}`;

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: "Salary", cells: jobs.map((j, i) => <span key={j.id} className="font-medium tabular-nums">{formatSalary(j.salaryMin, j.salaryMax, j.currency, j.jobType)}{bestPay.includes(i) && <Best />}</span>) },
    ...(matches ? [{ label: "Your skills match", cells: matches.map((m, i) => <span key={i} className="font-medium tabular-nums">{m.score}%{bestMatch.includes(i) && <Best />}</span>) }] : []),
    { label: "Work mode", cells: jobs.map((j) => MODE_LABELS[j.workMode]) },
    { label: "Location", cells: jobs.map((j) => j.location) },
    { label: "Job type", cells: jobs.map((j) => TYPE_LABELS[j.jobType]) },
    { label: "Level", cells: jobs.map((j) => LEVEL_LABELS[j.level]) },
    { label: "Posted", cells: jobs.map((j) => timeAgo(j.postedAt)) },
    {
      label: "Closes",
      cells: jobs.map((j) => {
        const d = daysUntil(j.closesAt);
        return d === null ? "No deadline" : d === 0 ? "Today" : `In ${d} ${d === 1 ? "day" : "days"}`;
      }),
    },
    {
      label: "Skills asked for",
      cells: jobs.map((j) => (
        <ul key={j.id} className="flex flex-wrap gap-1.5">
          {j.skills.map((s) => {
            const have = mp ? mine.has(skillKey(s)) : null;
            return (
              <li key={s} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs", have ? "border-transparent bg-success/10 text-success-fg" : "border-border text-muted")}>
                {have === true && <Check className="size-3" aria-hidden="true" />}
                {have === false && <Minus className="size-3" aria-hidden="true" />}
                {s}
                {have !== null && <span className="sr-only">{have ? " (you have this)" : " (not on your profile)"}</span>}
              </li>
            );
          })}
        </ul>
      )),
    },
  ];

  return (
    <section className="container py-8 md:py-10">
      <Link href="/jobs" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
        <ArrowLeft className="size-4" aria-hidden="true" /> All jobs
      </Link>
      <h1 className="mt-1 text-3xl">Compare jobs</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">
        {jobs.length} jobs side by side.{" "}
        {currencies.size > 1 && "Salaries are in different currencies, so “Highest” uses approximate fixed exchange rates. Treat it as a guide, not a quote."}
        {!user && " Sign in to see how each one matches your skills."}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">Comparison of {jobs.length} jobs</caption>
          <thead>
            <tr className="border-b border-border align-top">
              <th scope="col" className="sticky left-0 z-10 w-32 bg-surface p-4 text-xs font-medium text-muted">
                <span className="sr-only">Detail</span>
              </th>
              {jobs.map((j) => (
                <th key={j.id} scope="col" className="min-w-56 p-4 font-normal">
                  <div className="flex items-start gap-3">
                    <CompanyMark name={j.company.name} className="size-10" />
                    <div className="min-w-0">
                      <Link href={`/jobs/${j.slug}`} className="block text-base font-semibold leading-snug hover:text-primary">
                        {j.title}
                      </Link>
                      <p className="text-muted">{j.company.name}</p>
                      <Link href={without(j.id)} aria-label={`Remove ${j.title} from the comparison`} className="mt-1 inline-flex h-8 items-center gap-1 text-xs text-muted underline-offset-4 hover:text-text hover:underline">
                        <X className="size-3" aria-hidden="true" /> Remove
                      </Link>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label} className="align-top">
                <th scope="row" className="sticky left-0 z-10 bg-surface p-4 text-xs font-medium text-muted">
                  {r.label}
                </th>
                {r.cells.map((c, i) => (
                  <td key={i} className="p-4">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {jobs.length < MAX_COMPARE && (
          <Link href="/jobs" className={buttonVariants({ variant: "secondary" })}>
            Add another job
          </Link>
        )}
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} hidden={Boolean(user)} className="text-sm text-primary underline-offset-4 hover:underline">
          Sign in for match scores
        </Link>
      </div>
    </section>
  );
}
