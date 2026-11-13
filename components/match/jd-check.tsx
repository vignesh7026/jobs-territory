"use client";

import { useState, useTransition } from "react";
import { checkJobDescription, type CheckResult } from "@/app/(app)/fit/actions";
import { FitReportCard } from "@/components/match/fit-report";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Paste any job description (from another site, a message, a PDF) and see how your profile compares. */
export function JdCheck() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setResult(await checkJobDescription({ title, location, text })));
  }
  const err = (k: string) => (result && !result.ok ? result.fieldErrors?.[k] : undefined);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem]">
      <form onSubmit={run} noValidate className="grid gap-4" data-testid="jd-form">
        <Card className="grid gap-4 p-5">
          <div className="grid gap-1.5">
            <label htmlFor="jd-title" className="text-sm font-medium">Job title</label>
            <Input id="jd-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Engineer" maxLength={120} autoComplete="off" />
            {err("title") && <p className="text-sm text-danger-fg">{err("title")}</p>}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="jd-location" className="text-sm font-medium">Location <span className="font-normal text-muted">(optional)</span></label>
            <Input id="jd-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai, or Remote" maxLength={80} autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="jd-text" className="text-sm font-medium">Job description</label>
            <textarea id="jd-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-64 rounded-md border border-border bg-surface p-3 text-sm leading-relaxed" placeholder="Paste the responsibilities and requirements here." maxLength={12000} />
            {err("text") && <p className="text-sm text-danger-fg">{err("text")}</p>}
          </div>
          {result && !result.ok && !result.fieldErrors && <p role="alert" className="text-sm text-danger-fg">{result.message}</p>}
          <Button type="submit" variant="primary" size="lg" disabled={pending} className="justify-self-start">
            {pending ? "Comparing" : "Compare with my profile"}
          </Button>
          <p className="text-xs text-muted">We read the text here to compare it. Nothing is saved or shared.</p>
        </Card>
      </form>

      <div>
        {result?.ok ? (
          <>
            <FitReportCard report={result.report} jobTitle={result.title} />
            <p className="mt-2 text-xs text-muted">
              {result.skillsFound === 0
                ? "We could not find any known skills in that text, so the skills part is not held against you."
                : `We found ${result.skillsFound} known ${result.skillsFound === 1 ? "skill" : "skills"} in the text. A pasted description is read by rules, so check the list against the original.`}
            </p>
          </>
        ) : (
          <Card className="p-5 text-sm text-muted">Your score out of 100, how it adds up, and what is missing from your profile will appear here.</Card>
        )}
      </div>
    </div>
  );
}
