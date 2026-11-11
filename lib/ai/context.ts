import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiJob, AiProfile } from "@/lib/ai/features";
import type { MatchJob, MatchProfile } from "@/lib/match";
import type { JobLevel, JobType, WorkMode } from "@/lib/jobs/filters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

export interface LoadedJob {
  id: string;
  ai: AiJob;
  match: MatchJob;
}

/** A job by id, shaped for prompts and for the match calculation. Public data: any visitor may read it. */
export async function loadJob(jobId: string): Promise<LoadedJob | null> {
  if (!isUuid(jobId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, location, work_mode, job_type, level, summary, responsibilities, requirements, skills, companies(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return null;
  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  const level = data.level as JobLevel;
  const workMode = data.work_mode as WorkMode;
  return {
    id: data.id,
    ai: { title: data.title, company: company?.name ?? "the company", level, workMode, jobType: data.job_type as JobType, location: data.location, summary: data.summary, responsibilities: data.responsibilities, requirements: data.requirements, skills: data.skills },
    match: { skills: data.skills, level, workMode, location: data.location, title: data.title },
  };
}

export interface LoadedProfile {
  ai: AiProfile;
  match: MatchProfile;
  version: number;
}

/** The signed-in candidate's own profile (row-level security means it can only ever be their own). */
export async function loadProfile(userId: string): Promise<LoadedProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, headline, summary, skills, location, experience, education, resume_path, profile_version").eq("id", userId).maybeSingle();
  if (!data) return null;

  const rows = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : []);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const experience = rows(data.experience).map((e) => ({ title: str(e.title), company: str(e.company), period: str(e.period), description: str(e.description) }));
  const education = rows(data.education).map((e) => ({ school: str(e.school), degree: str(e.degree), year: str(e.year) }));

  return {
    version: data.profile_version,
    ai: { firstName: data.full_name.trim().split(/\s+/)[0] || "Candidate", headline: data.headline, summary: data.summary, skills: data.skills, experience, education },
    match: { skills: data.skills, location: data.location, experiencePeriods: experience.map((e) => e.period), hasExperience: experience.some((e) => e.title || e.company), hasResume: Boolean(data.resume_path) },
  };
}
