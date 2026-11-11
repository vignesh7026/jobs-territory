import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Building2, Clock, Laptop, MapPin } from "lucide-react";
import { ApplyController } from "@/components/jobs/apply-controller";
import { CompanyMark } from "@/components/jobs/job-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { daysUntil, formatSalary, timeAgo } from "@/lib/format";
import { getJobBySlug, getMyApplication, getMyResumeName } from "@/lib/jobs/detail";
import { LEVEL_LABELS, MODE_LABELS, TYPE_LABELS, type WorkMode } from "@/lib/jobs/filters";

const MODE_ICON: Record<WorkMode, React.ReactNode> = { onsite: <Building2 />, hybrid: <ArrowLeftRight />, remote: <Laptop /> };

export async function generateMetadata(props: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await getJobBySlug(slug);
  return job ? { title: `${job.title} at ${job.company.name}`, description: job.summary.slice(0, 160) } : { title: "Job not found" };
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl">{title}</h2>
      <ul className="mt-3 grid gap-2 pl-5 [&>li]:list-disc [&>li]:marker:text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function JobPage(props: PageProps<"/jobs/[slug]">) {
  const { slug } = await props.params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const user = await getCurrentUser();
  const [application, resumeName] = user ? await Promise.all([getMyApplication(job.id), getMyResumeName(user.id)]) : [null, null];

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency, job.jobType);
  const closesInDays = daysUntil(job.closesAt);
  const c = job.companyInfo;

  return (
    <section className="container pb-28 pt-6 lg:pb-12 lg:pt-8">
      <Link href="/jobs" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
        <ArrowLeft className="size-4" aria-hidden="true" /> All jobs
      </Link>

      <div className="mt-2 grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <article className="max-w-prose">
          <header>
            <div className="flex items-center gap-3">
              <CompanyMark name={c.name} className="size-12" />
              <p className="text-base font-medium">{c.name}</p>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl">{job.title}</h1>

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden="true" /> {job.location}
              </span>
              <span>Posted {timeAgo(job.postedAt).toLowerCase()}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge className="[&_svg]:size-3.5">
                {MODE_ICON[job.workMode]} {MODE_LABELS[job.workMode]}
              </Badge>
              <Badge>{TYPE_LABELS[job.jobType]}</Badge>
              <Badge>{LEVEL_LABELS[job.level]}</Badge>
              {job.closed ? (
                <Badge variant="danger">
                  <Clock /> Closed
                </Badge>
              ) : (
                closesInDays !== null &&
                closesInDays <= 7 && (
                  <Badge variant="warning">
                    <Clock /> {closesInDays === 0 ? "Closes today" : `Closes in ${closesInDays} ${closesInDays === 1 ? "day" : "days"}`}
                  </Badge>
                )
              )}
            </div>
          </header>

          {job.closed && (
            <p role="status" className="mt-6 rounded-md border border-border bg-surface p-3 text-sm">
              This job is no longer accepting applications. <Link href={`/jobs?q=${encodeURIComponent(job.title.split(/[,(]/)[0].trim())}`} className="font-medium text-primary underline-offset-4 hover:underline">Find similar jobs</Link>
            </p>
          )}

          <section className="mt-8">
            <h2 className="text-xl">About the role</h2>
            <p className="mt-3 text-base leading-relaxed">{job.summary}</p>
          </section>

          <Bullets title="What you will do" items={job.responsibilities} />
          <Bullets title="What we look for" items={job.requirements} />

          {job.skills.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl">Skills</h2>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Skills for this job">
                {job.skills.map((s) => (
                  <li key={s} className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <ApplyController
            job={{ id: job.id, slug: job.slug, title: job.title, company: c.name, closed: job.closed, salary, closesInDays }}
            signedIn={Boolean(user)}
            resumeName={resumeName}
            initialApplication={application}
          />
          <Card className="p-5">
            <h2 className="text-base">About {c.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {c.industry} &middot; {c.size} people &middot; {c.hq}
            </p>
            <p className="mt-3 text-sm leading-relaxed">{c.about}</p>
          </Card>
        </aside>
      </div>
    </section>
  );
}
