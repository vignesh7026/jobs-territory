import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ResponseStats } from "@/lib/people/response";

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export interface PersonProfile {
  slug: string;
  kind: "founder" | "recruiter";
  name: string;
  title: string;
  email: string;
  background: string;
  company: { slug: string; name: string; industry: string; size: string; hq: string };
  /** the other person listed for this company */
  colleague: { slug: string; name: string; kind: "founder" | "recruiter"; title: string } | null;
  openJobs: { slug: string; title: string; location: string }[];
}

/** Row-level security returns nothing to signed-out visitors, so this is null for them. */
export async function getPerson(slug: string): Promise<PersonProfile | null> {
  if (!SLUG.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_contacts")
    .select("slug, kind, full_name, title, email, background, companies(id, slug, name, industry, size, hq)")
    .eq("slug", slug)
    .maybeSingle();
  const c = data?.companies;
  if (!data || !c) return null;

  const [{ data: others }, { data: jobs }] = await Promise.all([
    supabase.from("company_contacts").select("slug, kind, full_name, title").eq("company_id", c.id).neq("slug", slug).limit(1),
    supabase.from("jobs").select("slug, title, location, closes_at").eq("company_id", c.id).order("posted_at", { ascending: false }).limit(12),
  ]);
  const now = Date.now();
  const o = others?.[0];
  return {
    slug: data.slug,
    kind: data.kind as "founder" | "recruiter",
    name: data.full_name,
    title: data.title,
    email: data.email,
    background: data.background,
    company: { slug: c.slug, name: c.name, industry: c.industry, size: c.size, hq: c.hq },
    colleague: o ? { slug: o.slug, name: o.full_name, kind: o.kind as "founder" | "recruiter", title: o.title } : null,
    openJobs: (jobs ?? []).filter((j) => !j.closes_at || new Date(j.closes_at).getTime() > now).map((j) => ({ slug: j.slug, title: j.title, location: j.location })),
  };
}

/** How fast this company has replied to applications on this site. Aggregates only. */
export async function getCompanyResponse(companySlug: string): Promise<ResponseStats> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("company_response", { p_slug: companySlug });
  const r = data?.[0];
  return { applications: Number(r?.applications ?? 0), replied: Number(r?.replied ?? 0), medianHours: r?.median_hours === null || r?.median_hours === undefined ? null : Number(r.median_hours) };
}
