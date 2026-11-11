"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SKILL_VOCABULARY, canonicalSkill } from "@/lib/skills";

interface Props {
  id: string;
  skills: string[];
  onChange: (skills: string[]) => void;
  error?: string;
}

export function SkillInput({ id, skills, onChange, error }: Props) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function add(raw: string) {
    const parts = raw.split(",").map((s) => canonicalSkill(s)).filter(Boolean);
    if (!parts.length) return;
    const have = new Set(skills.map((s) => s.toLowerCase()));
    const fresh = parts.filter((s) => !have.has(s.toLowerCase()) && have.add(s.toLowerCase()));
    if (fresh.length) onChange([...skills, ...fresh].slice(0, 40));
    setDraft("");
  }

  return (
    <div>
      {skills.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Your skills">
          {skills.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-1 pl-2.5 pr-1 text-sm text-text">
              {s}
              <button type="button" onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid size-6 place-items-center rounded text-muted transition-colors duration-fast hover:bg-primary/15 hover:text-text">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          list={listId}
          placeholder="Type a skill, then press Enter"
          aria-invalid={Boolean(error)}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
        />
        <datalist id={listId}>
          {SKILL_VOCABULARY.filter((s) => !skills.includes(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Button type="button" variant="secondary" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Plus aria-hidden="true" /> Add
        </Button>
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-fg">{error}</p>}
    </div>
  );
}
