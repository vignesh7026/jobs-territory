import type { Metadata } from "next";
import { ProfileEditor, type ProfileValues } from "@/components/profile/profile-editor";
import { requireUser } from "@/lib/auth/session";
import { getRoadmap } from "@/lib/career-queries";
import { progress } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

const text = (v: unknown) => (typeof v === "string" ? v : "");
const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : []);

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const plan = await getRoadmap(user.id);

  const initial: ProfileValues = {
    fullName: p?.full_name ?? user.fullName,
    phone: p?.phone ?? "",
    location: p?.location ?? "",
    headline: p?.headline ?? "",
    summary: p?.summary ?? "",
    skills: p?.skills ?? [],
    experience: rows(p?.experience).map((e) => ({ title: text(e.title), company: text(e.company), period: text(e.period), description: text(e.description) })),
    education: rows(p?.education).map((e) => ({ school: text(e.school), degree: text(e.degree), year: text(e.year) })),
  };
  // "<uid>/<timestamp>-<name>.pdf" -> show just the name
  const resumeName = p?.resume_path ? p.resume_path.split("/").pop()!.replace(/^\d+-/, "") : null;

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Profile</h1>
      <p className="mb-6 mt-2 max-w-prose text-muted">Employers see this when you apply. Keep your skills accurate: every match score is built from them.</p>
      <ProfileEditor initial={initial} initialResume={resumeName ? { name: resumeName } : null} email={user.email} plan={plan.length ? { target: plan[0].target, ...progress(plan) } : null} />
    </section>
  );
}
