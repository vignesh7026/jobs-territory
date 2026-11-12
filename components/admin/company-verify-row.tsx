"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyVerified } from "@/app/(app)/admin/companies/actions";
import { VerifiedBadge } from "@/components/jobs/verified-badge";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CompanyRow { id: string; name: string; industry: string; hq: string; verified: boolean; note: string | null; openJobs: number }

/** One company: its status, and a way to flip it. Verifying asks how it was checked, so every badge has a reason. */
export function CompanyVerifyRow({ c }: { c: CompanyRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  function submit(verified: boolean) {
    start(async () => {
      const r = await setCompanyVerified({ companyId: c.id, verified, note });
      if (r.ok) {
        toast({ title: verified ? `${c.name} verified` : `${c.name} marked not verified`, tone: "success" });
        setEditing(false);
        setNote("");
        router.refresh();
      } else toast({ title: r.message, tone: "error" });
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4" data-testid={`company-${c.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base">{c.name}</h2>
        <VerifiedBadge verified={c.verified} note={c.note} />
        <span className="text-sm text-muted">{c.industry} &middot; {c.hq} &middot; {c.openJobs} open {c.openJobs === 1 ? "job" : "jobs"}</span>
      </div>
      {c.verified && c.note && <p className="mt-1 text-sm text-muted">How it was checked: {c.note}</p>}
      {!editing ? (
        <div className="mt-3">
          {c.verified ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => submit(false)}>Remove verification</Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Verify this company</Button>
          )}
        </div>
      ) : (
        <form className="mt-3 grid gap-2 sm:max-w-md" onSubmit={(e) => { e.preventDefault(); submit(true); }}>
          <label htmlFor={`note-${c.id}`} className="text-sm font-medium">How did you check it?</label>
          <Input id={`note-${c.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Registration number and email domain match" maxLength={300} autoComplete="off" />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>Save verification</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </li>
  );
}
