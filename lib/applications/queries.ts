import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, isStatus, isUndoable, type ApplicationStatus } from "@/lib/applications/status";
import { isBlind, pseudonym } from "@/lib/anonymous";

export interface ApplicationEvent {
  id: number;
  status: ApplicationStatus;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface ApplicationSummary {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  /** furthest pipeline stage reached, even if the application was later rejected */
  reached: number;
  /** sent by the candidate's auto-apply rule rather than by hand */
  autoApplied?: boolean;
  job: { id: string; slug: string; title: string; location: string; company: string };
}

export interface ApplicationDetail extends ApplicationSummary {
  candidateId: string;
  coverNote: string | null;
  resumeName: string | null;
  events: ApplicationEvent[];
  /** can still be withdrawn (untouched and under ten minutes old) */
  undoable: boolean;
  candidate: { fullName: string; headline: string | null; location: string | null } | null;
  /** chosen by the candidate when applying */
  anonymous: boolean;
  /** anonymous and not yet shortlisted: reviewers get the stripped view only */
  blind: boolean;
  /** what a reviewer may see while blind */
  blindView: { skills: string[]; roles: { title: string; period: string; description: string }[]; degrees: { degree: string; year: string }[] } | null;
}

type JobJoin = { id: string; slug: string; title: string; location: string; companies: { name: string } | { name: string }[] | null };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Index of the furthest pipeline stage in a list of statuses (rejected does not count as progress). */
export function reachedStage(statuses: string[]): number {
  return statuses.reduce((max, s) => {
    const i = PIPELINE.indexOf(s as (typeof PIPELINE)[number]);
    return i > max ? i : max;
  }, 0);
}

function summary(r: {
  id: string; status: string; created_at: string; updated_at: string; auto_applied?: boolean; jobs: JobJoin | JobJoin[] | null; application_events?: { status: string }[];
}): ApplicationSummary | null {
  const job = one(r.jobs);
  if (!job || !isStatus(r.status)) return null;
  return {
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    autoApplied: r.auto_applied ?? false,
    reached: reachedStage([r.status, ...(r.application_events ?? []).map((e) => e.status)]),
    job: { id: job.id, slug: job.slug, title: job.title, location: job.location, company: one(job.companies)?.name ?? "Unknown company" },
  };
}

const JOB = "jobs(id, slug, title, location, companies(name))";

/** The signed-in user's own applications, most recently updated first. (Admins can read everyone's, so filter explicitly.) */
export async function listMyApplications(userId: string): Promise<ApplicationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(`id, status, created_at, updated_at, auto_applied, ${JOB}, application_events(status)`)
    .eq("candidate_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load applications: ${error.message}`);
  return (data ?? []).map((r) => summary(r as never)).filter((a): a is ApplicationSummary => a !== null);
}

/** One application with its full timeline. Row-level security decides who may see it: the owner or an admin. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getApplication(id: string): Promise<ApplicationDetail | null> {
  if (!UUID.test(id)) return null; // a malformed id is "not found", not a database error
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(`id, status, created_at, updated_at, candidate_id, cover_note, resume_path, anonymous, ${JOB}, application_events(id, status, note, actor_id, created_at)`)
    .eq("id", id)
    .order("created_at", { referencedTable: "application_events", ascending: true })
    .maybeSingle();
  if (error) throw new Error(`Could not load application: ${error.message}`);
  if (!data) return null;

  const base = summary(data as never);
  if (!base) return null;
  const events = (data.application_events ?? []).filter((e) => isStatus(e.status)).map((e) => ({ id: e.id, status: e.status as ApplicationStatus, note: e.note, actorId: e.actor_id, createdAt: e.created_at }));

  const blind = isBlind({ anonymous: data.anonymous, statuses: [base.status, ...events.map((e) => e.status)] });
  const { data: candidate } = await supabase.from("profiles").select("full_name, headline, location").eq("id", data.candidate_id).maybeSingle();
  let blindView: ApplicationDetail["blindView"] = null;
  if (blind && !candidate) {
    // An admin cannot read a blind profile row at all; this returns skills, titles and degrees only.
    const { data: bp } = await supabase.rpc("blind_profile", { p_application_id: id });
    const row = bp?.[0];
    if (row) blindView = { skills: row.skills, roles: (row.roles as { title: string; period: string; description: string }[]) ?? [], degrees: (row.degrees as { degree: string; year: string }[]) ?? [] };
  }
  return {
    ...base,
    reached: reachedStage(events.map((e) => e.status)),
    candidateId: data.candidate_id,
    coverNote: data.cover_note,
    resumeName: data.resume_path ? data.resume_path.split("/").pop()!.replace(/^\d+-/, "") : null,
    events,
    undoable: isUndoable(base.status, base.createdAt),
    candidate: candidate ? { fullName: candidate.full_name, headline: candidate.headline, location: candidate.location } : null,
    anonymous: data.anonymous,
    blind,
    blindView,
  };
}

export interface AdminApplicationRow extends ApplicationSummary {
  candidateName: string;
  anonymous: boolean;
}

export const ADMIN_PAGE_SIZE = 20;

/** Admin queue: every application, newest activity first, optionally one status. RLS lets only admins read across candidates. */
export async function listAllApplications(opts: { status?: ApplicationStatus; page: number }): Promise<{ rows: AdminApplicationRow[]; total: number; page: number; counts: Record<string, number> }> {
  const supabase = await createClient();
  const run = (page: number) => {
    let q = supabase
      .from("applications")
      .select(`id, status, created_at, updated_at, candidate_id, anonymous, ${JOB}, application_events(status), profiles(full_name)`, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
    if (opts.status) q = q.eq("status", opts.status);
    return q;
  };

  let page = opts.page;
  let { data, count, error } = await run(page);
  if (error?.code === "PGRST103") {
    // Asked for a page past the end: find the real last page and load that instead.
    let head = supabase.from("applications").select("id", { count: "exact", head: true });
    if (opts.status) head = head.eq("status", opts.status);
    const total = (await head).count ?? 0;
    page = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    ({ data, count, error } = await run(page));
  }
  if (error) throw new Error(`Could not load the queue: ${error.message}`);

  const rows = (data ?? [])
    .map((r) => {
      const s = summary(r as never);
      const p = one((r as unknown as { profiles: { full_name: string } | { full_name: string }[] | null }).profiles);
      const anonymous = (r as unknown as { anonymous: boolean }).anonymous;
      return s ? { ...s, anonymous, candidateName: p?.full_name || (anonymous ? pseudonym(s.id) : "Unnamed candidate") } : null;
    })
    .filter((r): r is AdminApplicationRow => r !== null);

  const { data: all } = await supabase.from("applications").select("status");
  const counts: Record<string, number> = {};
  for (const r of all ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return { rows, total: count ?? 0, page, counts };
}
