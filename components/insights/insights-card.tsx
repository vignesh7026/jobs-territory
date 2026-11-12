"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { removeInsight, shareInsight } from "@/app/(app)/insights/actions";
import { UpgradableLines } from "@/components/ai/upgradable-lines";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OUTCOMES, OUTCOME_LABEL, insightStats, plainInsightSummary, type Insight, type Outcome } from "@/lib/insights";
import { timeAgo } from "@/lib/format";
import { ReportButton } from "@/components/reports/report-button";

const select = "h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10";

/** What other candidates say about interviewing here: a three-line summary, the notes, and a form to add yours. */
export function InsightsCard({ companyId, companyName, jobSlug, jobTitle, insights, canShare, signedIn, loginHref }: { companyId: string; companyName: string; jobSlug: string; jobTitle: string; insights: Insight[]; canShare: boolean; signedIn: boolean; loginHref: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(jobTitle);
  const [rounds, setRounds] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [outcome, setOutcome] = useState<Outcome>("no_answer");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const stats = insightStats(insights);
  const shown = all ? insights : insights.slice(0, 3);
  const mine = insights.find((i) => i.mine);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await shareInsight({ companyId, jobSlug, roleTitle: role, rounds, difficulty, outcome, experience: text });
      if (r.ok) {
        toast({ title: "Thank you", description: "Your note is posted anonymously.", tone: "success" });
        setOpen(false);
        setText("");
        router.refresh();
      } else setError(r.message);
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await removeInsight(id, jobSlug);
      if (r.ok) {
        toast({ title: "Your note was removed" });
        router.refresh();
      } else toast({ title: r.message, tone: "error" });
    });
  }

  if (!signedIn) {
    return (
      <Card className="p-5">
        <h2 className="inline-flex items-center gap-2 text-base">
          <MessagesSquare className="size-4" aria-hidden="true" /> Interview experiences
        </h2>
        <p className="mt-2 text-sm text-muted">
          Candidates share anonymous notes about interviewing at {companyName}.{" "}
          <Link href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in to read them
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="insights">
      <h2 className="inline-flex items-center gap-2 text-base">
        <MessagesSquare className="size-4" aria-hidden="true" /> Interview experiences
      </h2>
      <UpgradableLines kind="peer-summary" body={{ companyId, company: companyName }} plain={plainInsightSummary(stats)} enabled={insights.length >= 2} className="mt-3 grid gap-1.5 text-sm" testId="insights-summary" />

      {shown.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {shown.map((n) => (
            <li key={n.id} className="rounded-md border border-border p-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="font-medium text-text">{n.roleTitle}</span>
                <span>
                  {n.rounds} {n.rounds === 1 ? "round" : "rounds"}
                </span>
                <span>difficulty {n.difficulty} of 5</span>
                <span>{OUTCOME_LABEL[n.outcome]}</span>
                <span>{timeAgo(n.createdAt)}</span>
                {n.isSample && <span className="rounded border border-border px-1.5 py-0.5">Sample note (demo data)</span>}
              </p>
              <p className="mt-1.5 leading-relaxed">{n.experience}</p>
              {!n.mine && !n.isSample && <div className="mt-1"><ReportButton kind="insight" targetId={n.id} label="Report this note" signedIn={signedIn} /></div>}
              {n.mine && (
                <button type="button" onClick={() => remove(n.id)} disabled={pending} className="mt-2 text-xs text-primary underline-offset-4 hover:underline">
                  Remove my note
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {insights.length > 3 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
          {all ? "Show fewer" : `Show all ${insights.length}`}
        </button>
      )}

      <div className="mt-4 border-t border-border pt-4">
        {mine ? (
          <p className="text-sm text-muted">You have shared a note about {companyName}.</p>
        ) : !canShare ? (
          <p className="text-sm text-muted">Applied to a job at {companyName}? You can then share what the process was like.</p>
        ) : !open ? (
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Share your experience
          </Button>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="ins-role" className="text-sm font-medium">
                Role you interviewed for
              </label>
              <Input id="ins-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label htmlFor="ins-rounds" className="text-sm font-medium">
                  Rounds
                </label>
                <select id="ins-rounds" className={select} value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="ins-diff" className="text-sm font-medium">
                  Difficulty
                </label>
                <select id="ins-diff" className={select} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} of 5
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="ins-out" className="text-sm font-medium">
                  Outcome
                </label>
                <select id="ins-out" className={select} value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {OUTCOME_LABEL[o]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="ins-text" className="text-sm font-medium">
                What was it like?
              </label>
              <Textarea id="ins-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="The stages, what they asked, what helped, what you would prepare. Please leave out names." />
              <p className="text-xs text-muted">{text.length} of 1500. Posted anonymously: only the company, role and your answers are shown, never who you are.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger-fg">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" disabled={pending}>
                {pending ? "Posting" : "Post anonymously"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
