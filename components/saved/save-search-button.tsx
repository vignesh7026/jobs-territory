"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BellPlus } from "lucide-react";
import { saveSearch } from "@/app/(app)/saved/actions";
import { useSearch } from "@/components/jobs/search-context";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODE_LABELS, TYPE_LABELS, hasActiveFilters, toSearchParams, type JobFilters } from "@/lib/jobs/filters";

/** A readable default name: the keyword and the first couple of filters. */
export function suggestName(f: JobFilters): string {
  const parts = [f.q, f.location, ...f.modes.map((m) => MODE_LABELS[m]), ...f.types.map((t) => TYPE_LABELS[t])].filter(Boolean);
  return (parts.slice(0, 3).join(" · ") || "My search").slice(0, 80);
}

export function SaveSearchButton({ signedIn }: { signedIn: boolean }) {
  const { filters } = useSearch();
  const { toast } = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!hasActiveFilters(filters)) return null;
  if (!signedIn) {
    return (
      <Link href="/login?next=/jobs" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-text hover:underline md:h-9">
        <BellPlus className="size-4" aria-hidden="true" /> Sign in to save this search
      </Link>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await saveSearch({ name, query: toSearchParams(filters).toString() });
      if (!r.ok) return setError(r.message);
      setOpen(false);
      toast({ title: r.duplicate ? "You already saved this search" : "Search saved", description: name, tone: "success" });
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setName(suggestName(filters));
          setError(undefined);
          setOpen(true);
        }}
      >
        <BellPlus aria-hidden="true" /> Save this search
      </Button>
      <dialog
        ref={ref}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        aria-labelledby="save-search-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-text/40"
      >
        <form onSubmit={submit} className="grid gap-4 p-5">
          <div>
            <h2 id="save-search-title" className="text-xl">
              Save this search
            </h2>
            <p className="mt-1 text-sm text-muted">It appears under Saved, and you can run it again in one click.</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="search-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? "search-name-error" : undefined} autoFocus />
            {error && (
              <p id="search-name-error" role="alert" className="text-sm text-danger-fg">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
              Save search
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
