import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { ReportActions } from "@/components/admin/report-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/session";
import { timeAgo } from "@/lib/format";
import { ACTION_LABEL, KIND_LABEL, REASONS, type Reason } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: reports" };

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: reports } = await supabase.from("reports").select("id, kind, target_id, reason, detail, created_at").eq("status", "open").order("created_at", { ascending: true });

  // One card per target, with every reason people gave.
  const groups = new Map<string, { kind: "job" | "company" | "insight"; targetId: string; firstId: string; items: { reason: Reason; detail: string | null; at: string }[] }>();
  for (const r of reports ?? []) {
    const key = `${r.kind}:${r.target_id}`;
    const g = groups.get(key) ?? { kind: r.kind, targetId: r.target_id, firstId: r.id, items: [] };
    g.items.push({ reason: r.reason, detail: r.detail, at: r.created_at });
    groups.set(key, g);
  }
  const list = [...groups.values()];

  const ids = (k: string) => list.filter((g) => g.kind === k).map((g) => g.targetId);
  const [jobs, companies, insights] = await Promise.all([
    ids("job").length ? supabase.from("jobs").select("id, slug, title, companies(name)").in("id", ids("job")) : { data: [] },
    ids("company").length ? supabase.from("companies").select("id, name, verified").in("id", ids("company")) : { data: [] },
    ids("insight").length ? supabase.from("interview_insights").select("id, role_title, experience, hidden, companies(name)").in("id", ids("insight")) : { data: [] },
  ]);
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v);

  const describe = (g: (typeof list)[number]) => {
    if (g.kind === "job") {
      const j = (jobs.data ?? []).find((x) => x.id === g.targetId);
      return j ? { title: j.title, sub: one(j.companies)?.name ?? "", href: `/jobs/${j.slug}` } : { title: "A job that no longer exists", sub: "", href: null };
    }
    if (g.kind === "company") {
      const c = (companies.data ?? []).find((x) => x.id === g.targetId);
      return c ? { title: c.name, sub: c.verified ? "Currently verified" : "Not verified", href: null } : { title: "A company that no longer exists", sub: "", href: null };
    }
    const n = (insights.data ?? []).find((x) => x.id === g.targetId);
    return n ? { title: `Interview note: ${n.role_title}`, sub: `${one(n.companies)?.name ?? ""}${n.hidden ? " · hidden from readers" : ""}`, href: null, body: n.experience } : { title: "A note that no longer exists", sub: "", href: null };
  };

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Reports</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">What candidates flagged. An interview note reported by three different people is hidden automatically until you decide.</p>
      {list.length === 0 ? (
        <EmptyState icon={<Flag />} title="No open reports" description="Nothing is waiting for review." />
      ) : (
        <ul className="grid gap-3">
          {list.map((g) => {
            const d = describe(g) as { title: string; sub: string; href: string | null; body?: string };
            return (
              <li key={`${g.kind}:${g.targetId}`} className="rounded-lg border border-border bg-surface p-4" data-testid="report-card">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{KIND_LABEL[g.kind]} &middot; {g.items.length} {g.items.length === 1 ? "report" : "reports"}</p>
                <h2 className="mt-1 text-base">{d.href ? <Link href={d.href} className="hover:text-primary">{d.title}</Link> : d.title}</h2>
                {d.sub && <p className="text-sm text-muted">{d.sub}</p>}
                {d.body && <p className="mt-2 rounded-md bg-bg p-3 text-sm">{d.body}</p>}
                <ul className="mt-3 grid gap-1 text-sm">
                  {g.items.map((i, n) => (
                    <li key={n}>
                      <span className="font-medium">{REASONS[i.reason]}</span> <span className="text-muted">({timeAgo(i.at)})</span>
                      {i.detail && <span className="block text-muted">&ldquo;{i.detail}&rdquo;</span>}
                    </li>
                  ))}
                </ul>
                <ReportActions reportId={g.firstId} actionLabel={ACTION_LABEL[g.kind]} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
