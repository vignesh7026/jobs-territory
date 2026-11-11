import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Mail, MapPin } from "lucide-react";
import { MessageDraft } from "@/components/people/message-draft";
import { CompanyMark } from "@/components/jobs/job-row";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { draftFirstMessage, draftSubject } from "@/lib/people/message";
import { getCompanyResponse, getPerson } from "@/lib/people/queries";
import { describeResponse } from "@/lib/people/response";
import { createClient } from "@/lib/supabase/server";
import { skillKey } from "@/lib/skills";

export async function generateMetadata(props: PageProps<"/people/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPerson(slug);
  return { title: p ? `${p.name}, ${p.company.name}` : "Profile not found" };
}

const TIPS = {
  recruiter: ["Name the exact role in the subject line.", "Say in one line why you fit, then ask one question.", "Attach nothing until they reply; your application already holds your resume."],
  founder: ["Keep it to four sentences. Founders read on a phone.", "Say what you noticed about the product or the team, then make your ask.", "Ask for ten minutes of their view, not for a job."],
} as const;

/** "Dr. Ramesh Iyer" -> "Ramesh" */
const givenName = (name: string) => name.replace(/^(dr|prof)\.?\s+/i, "").split(/\s+/)[0] ?? name;

export default async function PersonPage(props: PageProps<"/people/[slug]">) {
  const { slug } = await props.params;
  const user = await requireUser(`/people/${slug}`);
  const person = await getPerson(slug);
  if (!person) notFound();

  const sp = await props.searchParams;
  const wanted = typeof sp.job === "string" ? sp.job : undefined;
  const target = person.openJobs.find((j) => j.slug === wanted) ?? person.openJobs[0] ?? null;

  const supabase = await createClient();
  const [response, profileRes, jobRes] = await Promise.all([
    getCompanyResponse(person.company.slug),
    supabase.from("profiles").select("headline, skills").eq("id", user.id).maybeSingle(),
    target ? supabase.from("jobs").select("skills").eq("slug", target.slug).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const jobSkills = new Map((jobRes.data?.skills ?? []).map((s: string) => [skillKey(s), s]));
  const shared = (profileRes.data?.skills ?? []).map((s: string) => jobSkills.get(skillKey(s))).filter((s): s is string => Boolean(s));

  const first = givenName(person.name);
  const bio = person.kind === "founder" ? `${first} founded ${person.company.name}. Before that, they ${person.background}.` : `${first} leads hiring at ${person.company.name}. Earlier, they ${person.background}.`;

  const draft = target
    ? draftFirstMessage({
        contactName: person.name,
        contactKind: person.kind,
        company: person.company.name,
        jobTitle: target.title,
        candidateFirstName: user.fullName.split(/\s+/)[0] || "there",
        sharedSkills: shared,
        headline: profileRes.data?.headline ?? "",
      })
    : null;

  return (
    <section className="container pb-16 pt-6 lg:pt-8">
      <Link href={target ? `/jobs/${target.slug}` : "/jobs"} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to the job
      </Link>

      <div className="mt-2 grid items-start gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="max-w-prose">
          <header className="flex items-start gap-4">
            <CompanyMark name={givenName(person.name) + " " + person.name.split(/\s+/).slice(-1)[0]} className="size-16 text-xl" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{person.kind === "founder" ? "Founder" : "Recruiter"}</p>
              <h1 className="text-3xl">{person.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {person.title} at <span className="font-medium text-text">{person.company.name}</span>
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                <MapPin className="size-4" aria-hidden="true" /> {person.company.hq} &middot; {person.company.industry}
              </p>
            </div>
          </header>

          <section className="mt-8">
            <h2 className="text-xl">Background</h2>
            <p className="mt-2 text-base leading-relaxed">{bio}</p>
          </section>

          <section className="mt-8 rounded-lg border border-border bg-surface p-5" aria-labelledby="reply">
            <h2 id="reply" className="inline-flex items-center gap-2 text-base">
              <Clock className="size-4 text-muted" aria-hidden="true" /> How quickly {person.company.name} replies
            </h2>
            <p className="mt-2 text-sm leading-relaxed" data-testid="response-note">
              {describeResponse(response)}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">What works when writing to a {person.kind}</h2>
            <ul className="mt-3 grid gap-2 pl-5 [&>li]:list-disc [&>li]:marker:text-muted">
              {TIPS[person.kind].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Open roles at {person.company.name}</h2>
            {person.openJobs.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing open right now.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {person.openJobs.map((j) => (
                  <li key={j.slug}>
                    <Link href={`/people/${person.slug}?job=${j.slug}`} className="text-sm text-primary underline-offset-4 hover:underline" aria-current={target?.slug === j.slug ? "true" : undefined}>
                      {j.title}
                    </Link>
                    <span className="text-sm text-muted"> &middot; {j.location}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {person.colleague && (
            <p className="mt-8 text-sm text-muted">
              Also at {person.company.name}:{" "}
              <Link href={`/people/${person.colleague.slug}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {person.colleague.name}
              </Link>{" "}
              ({person.colleague.title})
            </p>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="text-base">Contact</h2>
            <a href={`mailto:${person.email}`} className="mt-2 inline-flex min-h-9 items-center gap-1.5 break-all text-sm text-primary underline-offset-4 hover:underline">
              <Mail className="size-4 shrink-0" aria-hidden="true" /> {person.email}
            </a>
          </Card>
          {draft && target ? (
            <Card className="p-5">
              <p className="mb-3 text-xs text-muted">
                About <span className="font-medium text-text">{target.title}</span>
              </p>
              <MessageDraft key={target.slug} initial={draft} subject={draftSubject(target.title)} to={person.email} />
            </Card>
          ) : (
            <Card className="p-5 text-sm text-muted">There is no open role to write about right now.</Card>
          )}
        </aside>
      </div>
    </section>
  );
}
