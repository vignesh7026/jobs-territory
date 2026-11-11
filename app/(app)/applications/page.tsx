import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { ApplicationRow } from "@/components/applications/application-row";
import { StatusFilter } from "@/components/applications/status-filter";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { isStatus } from "@/lib/applications/status";
import { listMyApplications } from "@/lib/applications/queries";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const user = await requireUser("/applications");
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && isStatus(sp.status) ? sp.status : undefined;

  const all = await listMyApplications(user.id);
  const counts: Record<string, number> = {};
  for (const a of all) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const shown = status ? all.filter((a) => a.status === status) : all;

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Applications</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">Every job you have applied to, with where it stands. Open one to see its full history.</p>

      {all.length === 0 ? (
        <EmptyState icon={<Inbox />} title="You have not applied to any jobs yet" description="When you apply, each application appears here with its status and a history of every change.">
          <Link href="/jobs" className={buttonVariants({ variant: "primary" })}>
            Browse jobs
          </Link>
        </EmptyState>
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
    </section>
  );
}
