"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useSearch } from "@/components/jobs/search-context";
import { JOB_LEVELS, JOB_TYPES, LEVEL_LABELS, MODE_LABELS, TYPE_LABELS, WORK_MODES, activeChips, withFilters } from "@/lib/jobs/filters";
import { cn } from "@/lib/utils";

function Group<T extends string>({ legend, options, labels, selected, onToggle }: { legend: string; options: readonly T[]; labels: Record<T, string>; selected: T[]; onToggle: (v: T) => void }) {
  return (
    <fieldset className="grid gap-0.5">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {options.map((o) => (
        <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-primary-soft md:min-h-9">
          <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} className="size-4 accent-[var(--primary)]" />
          {labels[o]}
        </label>
      ))}
    </fieldset>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterPanel({ signedIn }: { signedIn: boolean }) {
  const { filters, push } = useSearch();
  const [open, setOpen] = useState(false);
  const count = activeChips({ ...filters, q: "", location: "" }).length;

  return (
    <div>
      {/* On phones the filters fold away; from lg up they are always visible. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filter-groups"
        className="flex h-11 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-sm font-medium lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters{count > 0 && ` (${count})`}
        </span>
        <ChevronDown className={cn("size-4 transition-transform duration-fast", open && "rotate-180")} aria-hidden="true" />
      </button>

      <div id="filter-groups" className={cn("mt-3 grid gap-5 lg:mt-0 lg:block lg:space-y-6", open ? "grid" : "hidden lg:block")}>
        <fieldset className="grid gap-0.5">
          <legend className="mb-1 text-sm font-medium">Effort</legend>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-primary-soft md:min-h-9">
            <input type="checkbox" checked={filters.quick} onChange={() => push(withFilters(filters, { quick: !filters.quick }))} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Quick apply
              <span className="block text-xs text-muted">{signedIn ? "Jobs you match at 60% or more, apply in one tap" : "Sign in to use this"}</span>
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-primary-soft md:min-h-9">
            <input type="checkbox" checked={filters.verified} onChange={() => push(withFilters(filters, { verified: !filters.verified }))} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Verified companies only
              <span className="block text-xs text-muted">Hide companies an admin has not checked</span>
            </span>
          </label>
        </fieldset>
        <Group legend="Job type" options={JOB_TYPES} labels={TYPE_LABELS} selected={filters.types} onToggle={(v) => push(withFilters(filters, { types: toggle(filters.types, v) }))} />
        <Group legend="Work mode" options={WORK_MODES} labels={MODE_LABELS} selected={filters.modes} onToggle={(v) => push(withFilters(filters, { modes: toggle(filters.modes, v) }))} />
        <Group legend="Experience level" options={JOB_LEVELS} labels={LEVEL_LABELS} selected={filters.levels} onToggle={(v) => push(withFilters(filters, { levels: toggle(filters.levels, v) }))} />
      </div>
    </div>
  );
}
