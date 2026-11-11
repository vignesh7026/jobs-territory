import "server-only";
import { createClient } from "@/lib/supabase/server";
import { estimateLevel, nextLevel, timelineNodes, type EducationEntry, type ExperienceEntry, type TimelineNode } from "@/lib/career";
import type { JobLevel, WorkMode } from "@/lib/jobs/filters";
import { computeMatch } from "@/lib/match";

export interface RoadmapItem {
  id: string;
  week: number;
  skill: string;
  task: string;
  resourceTitle: string;
  resourceUrl: string;
  done: boolean;
  target: string;
}

export interface TargetRole {
  slug: string;
  id: string;
  title: string;
  company: string;
  level: JobLevel;
  score: number;
  missing: string[];
}

export interface CareerData {
  level: JobLevel;
  nodes: TimelineNode[];
  targets: TargetRole[];
  jobs: { id: string; slug: string; title: string; company: string }[];
  roadmap: RoadmapItem[];
}

const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function getRoadmap(userId: string): Promise<RoadmapItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("roadmap_items").select("id, week, skill, task, resource_title, resource_url, done, target").eq("candidate_id", userId).order("week").order("created_at");
  return (data ?? []).map((r) => ({ id: r.id, week: r.week, skill: r.skill, task: r.task, resourceTitle: r.resource_title, resourceUrl: r.resource_url, done: r.done, target: r.target }));
}

export async function getCareerData(userId: string): Promise<CareerData> {
  const supabase = await createClient();
  const [{ data: p }, { data: jobRows }, roadmap] = await Promise.all([
    supabase.from("profiles").select("skills, location, experience, education, resume_path").eq("id", userId).maybeSingle(),
    supabase.from("jobs").select("id, slug, title, level, work_mode, location, skills, closes_at, companies(name)").order("posted_at", { ascending: false }),
    getRoadmap(userId),
  ]);

  const experience: ExperienceEntry[] = rows(p?.experience).map((e) => ({ title: str(e.title), company: str(e.company), period: str(e.period), description: str(e.description) }));
  const education: EducationEntry[] = rows(p?.education).map((e) => ({ school: str(e.school), degree: str(e.degree), year: str(e.year) }));
  const level = estimateLevel(experience);
  const nodes = timelineNodes({ experience, education, level });

  const now = Date.now();
  const open = (jobRows ?? []).filter((j) => !j.closes_at || new Date(j.closes_at).getTime() > now);
  const profile = { skills: p?.skills ?? [], location: p?.location ?? "", experiencePeriods: experience.map((e) => e.period), hasExperience: experience.length > 0, hasResume: Boolean(p?.resume_path) };

  const company = (j: (typeof open)[number]) => (Array.isArray(j.companies) ? j.companies[0]?.name : (j.companies as { name: string } | null)?.name) ?? "";
  const scored = open.map((j) => {
    const m = computeMatch(profile, { skills: j.skills, level: j.level as JobLevel, workMode: j.work_mode as WorkMode, location: j.location, title: j.title });
    return { slug: j.slug, id: j.id, title: j.title, company: company(j), level: j.level as JobLevel, score: m.score, missing: m.missing };
  });

  // Targets: roles one level up first (a real step), then same-level roles you almost fit; best match first.
  const up = nextLevel(level);
  const targets = scored
    .filter((j) => (up ? j.level === up : j.level === level))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { level, nodes, targets, jobs: open.map((j) => ({ id: j.id, slug: j.slug, title: j.title, company: company(j) })), roadmap };
}
