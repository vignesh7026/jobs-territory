import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toListItem, type JobListItem } from "@/lib/jobs/queries";
import type { ApplicationStatus } from "@/lib/applications/status";

export interface JobDetail extends JobListItem {
  summary: string;
  responsibilities: string[];
  requirements: string[];
  closed: boolean;
  companyInfo: { name: string; slug: string; industry: string; size: string; hq: string; about: string };
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

export async function getJobBySlug(slug: string): Promise<JobDetail | null> {
  if (!SLUG.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, slug, title, location, work_mode, job_type, level, salary_min, salary_max, currency, posted_at, closes_at, skills, summary, responsibilities, requirements, companies(name, slug, industry, size, hq, about)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load job: ${error.message}`);
  if (!data) return null;

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  if (!company) return null;
  return {
    ...toListItem(data),
    summary: data.summary,
    responsibilities: data.responsibilities,
    requirements: data.requirements,
    closed: Boolean(data.closes_at && new Date(data.closes_at) <= new Date()),
    companyInfo: company,
  };
}

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
}

/** The signed-in candidate's application to this job, if any (row-level security limits this to their own). */
export async function getMyApplication(jobId: string): Promise<MyApplication | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("id, status, created_at").eq("job_id", jobId).maybeSingle();
  return data ? { id: data.id, status: data.status, createdAt: data.created_at } : null;
}

export async function getMyResumeName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("resume_path").eq("id", userId).maybeSingle();
  return data?.resume_path ? data.resume_path.split("/").pop()!.replace(/^\d+-/, "") : null;
}

export interface CompanyContact {
  kind: "founder" | "recruiter";
  name: string;
  title: string;
  email: string;
  slug: string;
}

/** The company's recruiter and founder. Row-level security returns nothing to signed-out visitors. */
export async function getCompanyContacts(companySlug: string): Promise<CompanyContact[]> {
  if (!SLUG.test(companySlug)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_contacts")
    .select("kind, full_name, title, email, slug, companies!inner(slug)")
    .eq("companies.slug", companySlug);
  return (data ?? [])
    .map((r) => ({ kind: r.kind as CompanyContact["kind"], name: r.full_name, title: r.title, email: r.email, slug: r.slug }))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "recruiter" ? -1 : 1));
}
