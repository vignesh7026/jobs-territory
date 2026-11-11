import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CompanyMark } from "@/components/jobs/job-row";
import { InterviewRunner } from "@/components/practice/interview-runner";
import { requireUser } from "@/lib/auth/session";
import { getJobBySlug } from "@/lib/jobs/detail";

export async function generateMetadata(props: PageProps<"/practice/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await getJobBySlug(slug);
  return { title: job ? `Practise: ${job.title}` : "Practice interview" };
}

export default async function PracticeJobPage(props: PageProps<"/practice/[slug]">) {
  const { slug } = await props.params;
  await requireUser(`/practice/${slug}`);
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  return (
    <section className="container max-w-3xl pb-16 pt-6 lg:pt-8">
      <Link href={`/jobs/${job.slug}`} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to the job
      </Link>
      <header className="mt-2 flex items-center gap-3">
        <CompanyMark name={job.companyInfo.name} className="size-12" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Mock interview</p>
          <h1 className="text-2xl md:text-3xl">{job.title}</h1>
          <p className="text-sm text-muted">{job.companyInfo.name}</p>
        </div>
      </header>
      <div className="mt-6">
        <InterviewRunner job={{ id: job.id, title: job.title, company: job.companyInfo.name }} />
      </div>
    </section>
  );
}
