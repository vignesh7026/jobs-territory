import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { StatusBadge } from "@/components/applications/status-badge";
import { StatusFilter } from "@/components/applications/status-filter";
import { ProgressSegments } from "@/components/applications/application-row";
import { EmptyState } from "@/components/ui/empty-state";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_PAGE_SIZE, listAllApplications } from "@/lib/applications/queries";
import { isStatus } from "@/lib/applications/status";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin: applications" };

export default async function AdminApplicationsPage(props: PageProps<"/admin/applications">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && isStatus(sp.status) ? sp.status : undefined;
  const pageRaw = Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const pageRequested = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 500) : 1;

  const { rows, total, counts, page } = await listAllApplications({ status, page: pageRequested });
  const grandTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const hrefFor = (p: number) => `/admin/applications?${new URLSearchParams({ ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`.replace(/\?$/, "");
  if (page !== pageRequested) redirect(hrefFor(page)); // a page past the end: go to the last real one

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Applications queue</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">Every application across all candidates. Open one to change its status and leave a note the candidate will see.</p>

      <StatusFilter base="/admin/applications" active={status} counts={counts} total={grandTotal} />

      <p role="status" className="mb-3 mt-5 text-sm text-muted">
        <span className="font-medium tabular-nums text-text">{total}</span> {total === 1 ? "application" : "applications"}
      </p>

      {rows.length === 0 ? (
        <EmptyState icon={<Inbox />} title="The queue is empty" description={status ? "No applications are at this status." : "No one has applied yet."}>
          {status && (
            <Link href="/admin/applications" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Show all statuses
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Applications, most recently updated first</caption>
              <thead className="border-b border-border bg-bg text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Candidate</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Job</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Progress</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors duration-fast hover:bg-primary-soft/60">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/applications/${r.id}`} className="hover:text-primary">
                        {r.candidateName}
                      </Link>
                      {r.anonymous && <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs font-normal text-muted">Anonymous</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.job.title} <span className="text-muted">&middot; {r.job.company}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ProgressSegments reached={r.reached} rejected={r.status === "rejected"} />
                    </td>
                    <td className="px-4 py-3 text-right text-muted tabular-nums">{timeAgo(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/applications/${r.id}`} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      {r.candidateName}
                      {r.anonymous && <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs font-normal text-muted">Anonymous</span>}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {r.job.title} &middot; {r.job.company}
                  </p>
                  <p className="text-xs text-muted tabular-nums">Updated {timeAgo(r.updatedAt).toLowerCase()}</p>
                </Link>
              </li>
            ))}
          </ul>

          <SimplePagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </section>
  );
}
