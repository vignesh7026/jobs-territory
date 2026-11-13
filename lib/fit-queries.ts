import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FitProfile } from "@/lib/fit";

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** The signed-in candidate's whole profile in the shape the fit report reads. Null for signed-out visitors. */
export async function getFitProfile(userId: string | null): Promise<FitProfile | null> {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("headline, summary, phone, location, skills, experience, education, resume_path").eq("id", userId).maybeSingle();
  if (!data) return null;
  const rows = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    headline: text(data.headline),
    summary: text(data.summary),
    phone: text(data.phone),
    location: text(data.location),
    skills: data.skills ?? [],
    experience: rows(data.experience).map((e) => ({ title: text(e.title), company: text(e.company), period: text(e.period), description: text(e.description) })),
    education: rows(data.education).map((e) => ({ school: text(e.school), degree: text(e.degree), year: text(e.year) })),
    hasResume: Boolean(data.resume_path),
  };
}
