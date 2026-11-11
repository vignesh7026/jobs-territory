import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { AdminStatusPanel } from "@/components/admin/status-panel";
import { EventLog } from "@/components/applications/event-log";
import { StatusBadge } from "@/components/applications/status-badge";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { CompanyMark } from "@/components/jobs/job-row";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getApplication } from "@/lib/applications/queries";
import { formatDate, timeAgo } from "@/lib/format";

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
          {isAdminView && (
            <>
              <Card className="p-5">
                <h2 className="text-base">Candidate</h2>
                <p className="mt-2 text-sm font-medium">{app.candidate?.fullName || "Unnamed candidate"}</p>
                {app.candidate?.headline && <p className="mt-1 text-sm text-muted">{app.candidate.headline}</p>}
                {app.candidate?.location && <p className="mt-1 text-sm text-muted">{app.candidate.location}</p>}
              </Card>
              <AdminStatusPanel applicationId={app.id} status={app.status} candidateName={app.candidate?.fullName || "The candidate"} />
            </>
          )}

          <Card className="p-5">
            <h2 className="text-base">{isOwner ? "What you sent" : "What they sent"}</h2>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
              {app.resumeName ? <span className="truncate">{app.resumeName}</span> : <span className="text-muted">No resume attached</span>}
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
