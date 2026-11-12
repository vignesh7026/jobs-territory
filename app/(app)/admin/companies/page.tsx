import type { Metadata } from "next";
import { CompanyVerifyRow, type CompanyRow } from "@/components/admin/company-verify-row";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: companies" };

export default async function AdminCompaniesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("id, name, industry, hq, verified, verification_note, jobs(count)").order("verified", { ascending: true }).order("name");
  const rows: CompanyRow[] = (data ?? []).map((c) => ({
    id: c.id, name: c.name, industry: c.industry, hq: c.hq, verified: c.verified, note: c.verification_note,
    openJobs: Array.isArray(c.jobs) ? Number((c.jobs[0] as { count?: number } | undefined)?.count ?? 0) : 0,
  }));
  const unverified = rows.filter((r) => !r.verified).length;

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Companies</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">
        Candidates see a Verified or Not verified badge on every job. Verify a company only after you have checked it, and say how. {unverified} of {rows.length} are not verified yet.
      </p>
      <ul className="grid gap-3">
        {rows.map((c) => <CompanyVerifyRow key={c.id} c={c} />)}
      </ul>
    </section>
  );
}
