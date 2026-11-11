import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { AdminStatusPanel } from "@/components/admin/status-panel";
import { EventLog } from "@/components/applications/event-log";
import { FollowUpPanel } from "@/components/applications/follow-up-panel";
import { NegotiationPanel } from "@/components/applications/negotiation-panel";
import { HealthMeter } from "@/components/applications/health-meter";
import { applicationHealth } from "@/lib/applications/health";
import { StatusBadge } from "@/components/applications/status-badge";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { CompanyMark } from "@/components/jobs/job-row";
import { Card } from "@/components/ui/card";
import { pseudonym, yearsOfExperience } from "@/lib/anonymous";
import { requireUser } from "@/lib/auth/session";
import { getApplication } from "@/lib/applications/queries";
import { formatDate, timeAgo } from "@/lib/format";
import { describeRange } from "@/lib/negotiate";
import { getMarketSample } from "@/lib/negotiate-queries";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/applications/${id}`);
  const app = await getApplication(id); // row-level security: only the owner or an admin gets a row
  if (!app) notFound();

  const isOwner = app.candidateId === user.id;
  const isAdminView = !isOwner && user.role === "admin";
  if (!isOwner && !isAdminView) notFound();

  const canWithdraw = isOwner && app.undoable;
  const health = isOwner ? applicationHealth(app.status, app.updatedAt) : null;
  const market = isOwner && app.status === "offered" ? await getMarketSample(app.job.id) : null;

  return (
    <section className="container py-6 md:py-8">
      <Link href={isAdminView ? "/admin/applications" : "/applications"} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
        <ArrowLeft className="size-4" aria-hidden="true" /> {isAdminView ? "Admin queue" : "All applications"}
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CompanyMark name={app.job.company} className="size-12" />
          <div>
            <h1 className="text-2xl md:text-3xl">
              <Link href={`/jobs/${app.job.slug}`} className="hover:text-primary">
                {app.job.title}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-text">{app.job.company}</span> &middot; {app.job.location}
            </p>
          </div>
        </div>
        <div className="grid justify-items-end gap-1">
          <StatusBadge status={app.status} />
          <p className="text-xs text-muted tabular-nums">
            Applied {formatDate(app.createdAt)} &middot; updated {timeAgo(app.updatedAt).toLowerCase()}
          </p>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Card className="p-5 md:p-6">
            <h2 className="mb-5 text-xl">Progress</h2>
            <StatusTimeline status={app.status} events={app.events} />
          </Card>

          <Card className="p-5 md:p-6">
            <h2 className="mb-4 text-xl">History</h2>
            <EventLog events={app.events} candidateId={app.candidateId} viewerIsCandidate={isOwner} />
          </Card>
        </div>

        <aside className="grid gap-4">
          {isOwner && app.anonymous && (
            <Card className="p-5" data-testid="anon-note">
              <h2 className="text-base">Applied anonymously</h2>
              <p className="mt-1 text-sm text-muted">{app.blind ? "Reviewers see your skills and experience, not your name, college, employers or resume. That changes when you are shortlisted." : "You were shortlisted, so reviewers can now see your name and resume."}</p>
            </Card>
          )}

          {health && (
            <Card className="p-5">
              <h2 className="mb-3 text-base">Application health</h2>
              <HealthMeter result={health} />
              <div className="mt-4 border-t border-border pt-4">
                <FollowUpPanel applicationId={app.id} urgent={health.health !== "on_track"} />
              </div>
            </Card>
          )}

          {isOwner && app.status === "offered" && (
            <Card className="p-5">
              <h2 className="mb-3 text-base">You have an offer</h2>
              <NegotiationPanel applicationId={app.id} rangeText={market ? describeRange(market.range, market.monthly) : null} sample={market?.range.sample ?? 0} />
            </Card>
          )}

          {isAdminView && (
            <>
              {app.blind ? (
                <Card className="p-5" data-testid="blind-card">
                  <h2 className="text-base">{pseudonym(app.id)}</h2>
                  <p className="mt-1 text-xs text-muted">Applied anonymously. Name, college, employers and resume are hidden until you shortlist.</p>
                  {app.blindView ? (
                    <div className="mt-4 grid gap-4 text-sm">
                      <p>
                        <span className="font-medium">About {yearsOfExperience(app.blindView.roles.map((r) => r.period))} years</span> of experience
                      </p>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">Skills</p>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {app.blindView.skills.map((s) => (
                            <li key={s} className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {app.blindView.roles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted">Experience</p>
                          <ul className="mt-1.5 grid gap-2">
                            {app.blindView.roles.map((r, i) => (
                              <li key={i}>
                                <span className="font-medium">{r.title}</span> <span className="text-muted">({r.period})</span>
                                {r.description && <span className="block text-muted">{r.description}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {app.blindView.degrees.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted">Education</p>
                          <ul className="mt-1.5 grid gap-1">
                            {app.blindView.degrees.map((d, i) => (
                              <li key={i}>
                                {d.degree} {d.year && <span className="text-muted">({d.year})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">No skills or experience on file.</p>
                  )}
                </Card>
              ) : (
                <Card className="p-5">
                  <h2 className="text-base">Candidate</h2>
                  <p className="mt-2 text-sm font-medium">{app.candidate?.fullName || "Unnamed candidate"}</p>
                  {app.candidate?.headline && <p className="mt-1 text-sm text-muted">{app.candidate.headline}</p>}
                  {app.candidate?.location && <p className="mt-1 text-sm text-muted">{app.candidate.location}</p>}
                </Card>
              )}
              <AdminStatusPanel applicationId={app.id} status={app.status} candidateName={app.blind ? pseudonym(app.id) : app.candidate?.fullName || "The candidate"} />
            </>
          )}

          <Card className="p-5">
            <h2 className="text-base">{isOwner ? "What you sent" : "What they sent"}</h2>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
              {isAdminView && app.blind ? <span className="text-muted">Hidden until shortlisted</span> : app.resumeName ? <span className="truncate">{app.resumeName}</span> : <span className="text-muted">No resume attached</span>}
            </div>
            <h3 className="mt-4 text-sm font-medium">Cover note</h3>
            {app.coverNote ? <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{app.coverNote}</p> : <p className="mt-1 text-sm text-muted">No cover note.</p>}
          </Card>

          {canWithdraw && (
            <Card className="p-5">
              <h2 className="text-base">Changed your mind?</h2>
              <p className="mb-3 mt-1 text-sm text-muted">You can withdraw this for the first 10 minutes, until someone reviews it.</p>
              <WithdrawButton applicationId={app.id} jobTitle={app.job.title} />
            </Card>
          )}
        </aside>
      </div>
    </section>
  );
}
