import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, KanbanSquare, List } from "lucide-react";
import { ApplicationRow } from "@/components/applications/application-row";
import { Board } from "@/components/applications/board";
import { StatusFilter } from "@/components/applications/status-filter";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { applicationHealth } from "@/lib/applications/health";
import { isStatus } from "@/lib/applications/status";
import { listMyApplications } from "@/lib/applications/queries";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const user = await requireUser("/applications");
  const sp = await props.searchParams;
  const view = sp.view === "board" ? "board" : "list";
  const status = typeof sp.status === "string" && isStatus(sp.status) ? sp.status : undefined;

  const all = await listMyApplications(user.id);
  const counts: Record<string, number> = {};
  for (const a of all) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const shown = status ? all.filter((a) => a.status === status) : all;

  const tab = "inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-fast md:h-9";

  return (
    <section className="container py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Applications</h1>
          <p className="mt-2 max-w-prose text-muted">Every job you have applied to, with where it stands. Open one to see its full history.</p>
        </div>
        {all.length > 0 && (
          <nav aria-label="View" className="flex gap-1.5">
            <Link href="/applications" aria-current={view === "list" ? "page" : undefined} className={cn(tab, view === "list" ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface hover:bg-primary-soft")}>
              <List className="size-4" aria-hidden="true" /> List
            </Link>
            <Link href="/applications?view=board" aria-current={view === "board" ? "page" : undefined} className={cn(tab, view === "board" ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface hover:bg-primary-soft")}>
              <KanbanSquare className="size-4" aria-hidden="true" /> Board
            </Link>
          </nav>
        )}
      </div>

      <div className="mt-6">
        {all.length === 0 ? (
          <EmptyState icon={<Inbox />} title="You have not applied to any jobs yet" description="When you apply, each application appears here with its status and a history of every change.">
            <Link href="/jobs" className={buttonVariants({ variant: "primary" })}>
              Browse jobs
            </Link>
          </EmptyState>
        ) : view === "board" ? (
          <Board apps={all.map((a) => ({ id: a.id, title: a.job.title, company: a.job.company, status: a.status, updated: timeAgo(a.updatedAt), health: applicationHealth(a.status, a.updatedAt) }))} />
        ) : (
          <>
            <StatusFilter base="/applications" active={status} counts={counts} total={all.length} />
            <p role="status" className="mb-3 mt-5 text-sm text-muted">
              <span className="font-medium tabular-nums text-text">{shown.length}</span> {shown.length === 1 ? "application" : "applications"}
            </p>
            {shown.length > 0 ? (
              <ul className="grid gap-3">
                {shown.map((a) => (
                  <ApplicationRow key={a.id} application={a} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing with that status" description="None of your applications are at this stage right now.">
                <Link href="/applications" className={buttonVariants({ variant: "secondary" })}>
                  Show all applications
                </Link>
              </EmptyState>
            )}
          </>
        )}
      </div>
    </section>
  );
}
