"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveProfile } from "@/app/(app)/profile/actions";
import { EducationList, ExperienceList, type EducationValue, type ExperienceValue } from "@/components/profile/entries";
import { ResumeCard, type ResumeState } from "@/components/profile/resume-card";
import { SkillInput } from "@/components/profile/skill-input";
import { StrengthMeter } from "@/components/profile/strength-meter";
import { VoiceBuilder } from "@/components/profile/voice-builder";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { profileStrength } from "@/lib/profile-strength";
import { mergeSkills } from "@/lib/voice-profile";
import { profileSchema } from "@/lib/validation/profile";
import { pathErrors } from "@/lib/validation/shared";

export interface ProfileValues {
  fullName: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: ExperienceValue[];
  education: EducationValue[];
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-5">
      <h2 className="text-xl">{title}</h2>
      {description && <p className="mb-4 mt-1 text-sm text-muted">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </Card>
  );
}

export function ProfileEditor({ initial, initialResume, email, plan }: { initial: ProfileValues; initialResume: ResumeState | null; email: string; plan: { target: string; done: number; total: number; percent: number } | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ProfileValues>(initial);
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial));
  const [resume, setResume] = useState<ResumeState | null>(initialResume);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();

  const dirty = JSON.stringify(values) !== snapshot;
  const clientErrors = useMemo(() => {
    const r = profileSchema.safeParse(values);
    return r.success ? {} : pathErrors(r.error);
  }, [values]);
  const errorFor = (path: string) => (touched.has(path) ? clientErrors[path] : undefined) ?? serverErrors[path];
  const touch = (path: string) => setTouched((t) => (t.has(path) ? t : new Set(t).add(path)));

  function update<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (Object.keys(serverErrors).length) setServerErrors({});
  }

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const strength = profileStrength({
    headline: values.headline,
    summary: values.summary,
    phone: values.phone,
    location: values.location,
    skills: values.skills,
    experienceCount: values.experience.filter((e) => e.title.trim() || e.company.trim()).length,
    educationCount: values.education.filter((e) => e.school.trim() || e.degree.trim()).length,
    hasResume: resume !== null,
  });

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const bad = Object.keys(clientErrors);
    if (bad.length) {
      setTouched((t) => new Set([...t, ...bad]));
      toast({ title: `Fix ${bad.length} ${bad.length === 1 ? "field" : "fields"} before saving`, tone: "error" });
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    startSaving(async () => {
      const result = await saveProfile(values);
      if (result.ok) {
        setSnapshot(JSON.stringify(values));
        toast({ title: "Profile saved", tone: "success" });
        router.refresh();
      } else {
        setServerErrors(result.fieldErrors ?? {});
        toast({ title: result.message ?? "Could not save", tone: "error" });
      }
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <aside className="grid gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
        <StrengthMeter score={strength.score} next={strength.next} />
        <ResumeCard resume={resume} onChange={setResume} />
        {plan && (
          <Card className="p-5" data-testid="plan-card">
            <h2 className="text-base">Learning plan</h2>
            <p className="mt-1 text-sm text-muted">{plan.target}</p>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <span className="block h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${plan.percent / 100})` }} />
            </span>
            <p className="mt-2 text-sm tabular-nums">{plan.done} of {plan.total} tasks done</p>
            <Link href="/career#plan" className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">Open the plan</Link>
          </Card>
        )}
        <VoiceBuilder
          onApply={(pick) => {
            setValues((v) => ({ ...v, headline: pick.headline ?? v.headline, summary: pick.summary ?? v.summary, skills: mergeSkills(v.skills, pick.skills) }));
            toast({ title: "Added to your profile", description: "Review it, then press Save changes." });
          }}
        />
      </aside>

      <form onSubmit={onSave} noValidate className="grid gap-6 lg:col-start-1 lg:row-start-1">
        <Section id="basics" title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="fullName" label="Full name" error={errorFor("fullName")}>
              {(c) => <Input {...c} value={values.fullName} onChange={(e) => update("fullName", e.target.value)} onBlur={() => touch("fullName")} autoComplete="name" />}
            </FormField>
            <FormField id="email" label="Email" hint="Your sign-in email. It cannot be changed here.">
              {(c) => <Input {...c} value={email} readOnly disabled />}
            </FormField>
            <FormField id="headline" label="Headline" hint="What you do, in one line." error={errorFor("headline")} className="sm:col-span-2">
              {(c) => <Input {...c} value={values.headline} maxLength={160} onChange={(e) => update("headline", e.target.value)} onBlur={() => touch("headline")} placeholder="Full stack developer, three years in fintech and logistics" />}
            </FormField>
            <FormField id="location" label="Location" error={errorFor("location")}>
              {(c) => <Input {...c} value={values.location} onChange={(e) => update("location", e.target.value)} onBlur={() => touch("location")} autoComplete="address-level2" placeholder="Coimbatore, Tamil Nadu" />}
            </FormField>
            <FormField id="phone" label="Phone" error={errorFor("phone")}>
              {(c) => <Input {...c} type="tel" value={values.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => touch("phone")} autoComplete="tel" placeholder="+91 98430 27719" />}
            </FormField>
            <FormField id="summary" label="Summary" error={errorFor("summary")} className="sm:col-span-2" hint={`${values.summary.length} of 2000 characters`}>
              {(c) => <Textarea {...c} rows={5} value={values.summary} onChange={(e) => update("summary", e.target.value)} onBlur={() => touch("summary")} placeholder="What you build, what you have shipped, and what you want to do next." />}
            </FormField>
          </div>
        </Section>

        <Section id="skills" title="Skills" description="These drive your match score on every job. List what you could do in a work test tomorrow.">
          <SkillInput id="skills-input" skills={values.skills} onChange={(s) => update("skills", s)} error={errorFor("skills")} />
        </Section>

        <Section id="experience" title="Experience" description="Most recent first.">
          <ExperienceList items={values.experience} onChange={(v) => update("experience", v)} errorFor={errorFor} touch={touch} />
        </Section>

        <Section id="education" title="Education">
          <EducationList items={values.education} onChange={(v) => update("education", v)} errorFor={errorFor} touch={touch} />
        </Section>

        {/* One primary button on the page: Save. Sticks to the bottom so it is always reachable on phones. */}
        <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:mx-0 sm:rounded-lg sm:border">
          <p className="text-sm text-muted" aria-live="polite">
            {saving ? "Saving" : dirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <div className="flex gap-2">
            {dirty && !saving && (
              <Button type="button" variant="ghost" onClick={() => { setValues(JSON.parse(snapshot) as ProfileValues); setTouched(new Set()); setServerErrors({}); }}>
                Discard
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={!dirty || saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
