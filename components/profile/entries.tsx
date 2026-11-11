"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/shell/toaster";

export interface ExperienceValue { title: string; company: string; period: string; description: string }
export interface EducationValue { school: string; degree: string; year: string }

interface Common {
  /** error for a dotted path, already filtered to touched/server errors */
  errorFor: (path: string) => string | undefined;
  touch: (path: string) => void;
}

/** Removing an entry is reversible until the profile is saved: an Undo toast puts it back where it was. */
function useRemoveWithUndo<T>(items: T[], onChange: (next: T[]) => void, noun: string) {
  const { toast } = useToast();
  return (index: number) => {
    const removed = items[index];
    onChange(items.filter((_, i) => i !== index));
    toast({
      title: `${noun} removed`,
      description: "Not saved yet.",
      action: {
        label: "Undo",
        onClick: () => onChange([...items.slice(0, index), removed, ...items.slice(index)]),
      },
    });
  };
}

export function ExperienceList({ items, onChange, errorFor, touch }: Common & { items: ExperienceValue[]; onChange: (v: ExperienceValue[]) => void }) {
  const remove = useRemoveWithUndo(items, onChange, "Role");
  const set = (i: number, patch: Partial<ExperienceValue>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  return (
    <div className="grid gap-4">
      {items.length === 0 && <p className="text-sm text-muted">No roles yet. Internships, freelance work and projects count too.</p>}
      {items.map((it, i) => {
        const p = (f: string) => `experience.${i}.${f}`;
        return (
          <Card key={i} className="grid gap-3 bg-bg p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`exp-${i}-title`} label="Role" error={errorFor(p("title"))}>
                {(c) => <Input {...c} value={it.title} onChange={(e) => set(i, { title: e.target.value })} onBlur={() => touch(p("title"))} autoComplete="organization-title" />}
              </FormField>
              <FormField id={`exp-${i}-company`} label="Company or project" error={errorFor(p("company"))}>
                {(c) => <Input {...c} value={it.company} onChange={(e) => set(i, { company: e.target.value })} onBlur={() => touch(p("company"))} autoComplete="organization" />}
              </FormField>
            </div>
            <FormField id={`exp-${i}-period`} label="Period" hint="For example: Jul 2023 - Present" error={errorFor(p("period"))}>
              {(c) => <Input {...c} value={it.period} onChange={(e) => set(i, { period: e.target.value })} onBlur={() => touch(p("period"))} />}
            </FormField>
            <FormField id={`exp-${i}-description`} label="What you did" hint="One or two lines with a result, if you have one." error={errorFor(p("description"))}>
              {(c) => <Textarea {...c} rows={3} value={it.description} onChange={(e) => set(i, { description: e.target.value })} onBlur={() => touch(p("description"))} />}
            </FormField>
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-danger-fg hover:bg-danger/10">
                <Trash2 aria-hidden="true" /> Remove role
              </Button>
            </div>
          </Card>
        );
      })}
      <div>
        <Button type="button" variant="secondary" onClick={() => onChange([...items, { title: "", company: "", period: "", description: "" }])} disabled={items.length >= 15}>
          <Plus aria-hidden="true" /> Add role
        </Button>
      </div>
    </div>
  );
}

export function EducationList({ items, onChange, errorFor, touch }: Common & { items: EducationValue[]; onChange: (v: EducationValue[]) => void }) {
  const remove = useRemoveWithUndo(items, onChange, "Education entry");
  const set = (i: number, patch: Partial<EducationValue>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  return (
    <div className="grid gap-4">
      {items.length === 0 && <p className="text-sm text-muted">No education added yet.</p>}
      {items.map((it, i) => {
        const p = (f: string) => `education.${i}.${f}`;
        return (
          <Card key={i} className="grid gap-3 bg-bg p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`edu-${i}-school`} label="School or college" error={errorFor(p("school"))}>
                {(c) => <Input {...c} value={it.school} onChange={(e) => set(i, { school: e.target.value })} onBlur={() => touch(p("school"))} />}
              </FormField>
              <FormField id={`edu-${i}-degree`} label="Degree or course" error={errorFor(p("degree"))}>
                {(c) => <Input {...c} value={it.degree} onChange={(e) => set(i, { degree: e.target.value })} onBlur={() => touch(p("degree"))} />}
              </FormField>
            </div>
            <FormField id={`edu-${i}-year`} label="Year" hint="A year or range, like 2019-2023" error={errorFor(p("year"))} className="sm:max-w-48">
              {(c) => <Input {...c} value={it.year} onChange={(e) => set(i, { year: e.target.value })} onBlur={() => touch(p("year"))} inputMode="numeric" />}
            </FormField>
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-danger-fg hover:bg-danger/10">
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            </div>
          </Card>
        );
      })}
      <div>
        <Button type="button" variant="secondary" onClick={() => onChange([...items, { school: "", degree: "", year: "" }])} disabled={items.length >= 10}>
          <Plus aria-hidden="true" /> Add education
        </Button>
      </div>
    </div>
  );
}
