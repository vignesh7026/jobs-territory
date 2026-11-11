import "server-only";
import { createClient } from "@/lib/supabase/server";
import { matchAlumni, type Employee, type Relationship } from "@/lib/referral";

export interface Connection {
  id: string;
  fullName: string;
  relationship: Relationship;
}

export interface ReferralData {
  alumni: Employee[];
  connections: Connection[];
  /** colleges on the profile, so the card can say what it matched on */
  colleges: string[];
}

/** Alumni at the company (matched on the colleges in your profile) and the people you have told us you know there. */
export async function getReferralData(userId: string, companyId: string): Promise<ReferralData> {
  const supabase = await createClient();
  const [{ data: profile }, { data: staff }, { data: mine }] = await Promise.all([
    supabase.from("profiles").select("education").eq("id", userId).maybeSingle(),
    supabase.from("company_employees").select("id, full_name, title, college, grad_year").eq("company_id", companyId),
    supabase.from("connections").select("id, full_name, relationship").eq("candidate_id", userId).eq("company_id", companyId).order("created_at"),
  ]);

  const edu = Array.isArray(profile?.education) ? (profile.education as { school?: unknown }[]) : [];
  const colleges = edu.map((e) => (typeof e?.school === "string" ? e.school : "")).filter(Boolean);
  const employees: Employee[] = (staff ?? []).map((e) => ({ id: e.id, fullName: e.full_name, title: e.title, college: e.college, gradYear: e.grad_year }));

  return {
    alumni: matchAlumni(colleges, employees),
    connections: (mine ?? []).map((c) => ({ id: c.id, fullName: c.full_name, relationship: c.relationship as Relationship })),
    colleges,
  };
}
