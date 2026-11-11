import Link from "next/link";
import { AlertTriangle, Check, Minus } from "lucide-react";
import { MatchRing } from "@/components/match/match-ring";
import { Card } from "@/components/ui/card";
import { TIER_LABEL, type MatchResult } from "@/lib/match";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL = { high: "Big gap", medium: "Worth knowing", low: "Minor" } as const;

/** Your match: score, two plain lines, and the skills you have and lack. */
export function MatchCard({ match, explanation, jobSkillCount }: { match: MatchResult; explanation: [string, string]; jobSkillCount: number }) {
  return (
    <Card className="p-5">
      <h2 className="text-base">Your match</h2>
      <div className="mt-3 flex items-center gap-4">
        <MatchRing score={match.score} />
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold">{TIER_LABEL[match.tier]}</p>
          <p className="text-sm text-muted tabular-nums">{jobSkillCount === 0 ? "No skills listed" : `${match.matched.length} of ${jobSkillCount} listed skills`}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-1.5 text-sm leading-relaxed" data-testid="match-explanation">
        <p>{explanation[0]}</p>
        <p className="text-muted">{explanation[1]}</p>
      </div>

      {(match.matched.length > 0 || match.missing.length > 0) && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skill comparison">
          {match.matched.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success-fg">
              <Check className="size-3.5" aria-hidden="true" />
              {s}
              <span className="sr-only"> (you have this)</span>
            </li>
          ))}
          {match.missing.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted">
              <Minus className="size-3.5" aria-hidden="true" />
              {s}
              <span className="sr-only"> (not on your profile)</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Straight talk about what could count against the candidate, most serious first. Shown even when the score is high. */
export function GapCard({ match }: { match: MatchResult }) {
  const gaps = match.gaps.slice(0, 4);
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base">
        <AlertTriangle className="size-4 text-warning-fg" aria-hidden="true" /> Why you might not get this
      </h2>
      {gaps.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing obvious. Your skills, experience and location line up with the listing. That does not guarantee a reply, but nothing here should hold you back.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {gaps.map((g) => (
            <li key={g.id} className="grid gap-0.5 text-sm">
              <span className={cn("text-xs font-medium", g.severity === "high" ? "text-danger-fg" : g.severity === "medium" ? "text-warning-fg" : "text-muted")}>{SEVERITY_LABEL[g.severity]}</span>
              <span className="leading-relaxed">{g.text}</span>
            </li>
          ))}
        </ul>
      )}
      {match.missing.length > 0 && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Have a skill we did not list? <Link href="/profile#skills" className="text-primary underline-offset-4 hover:underline">Add it to your profile</Link> and the score updates.
        </p>
      )}
    </Card>
  );
}

/** Prompt for visitors who are not signed in. */
export function MatchSignIn({ href }: { href: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-base">Your match</h2>
      <p className="mt-2 text-sm text-muted">Sign in to see how your skills line up with this job, and what could count against you.</p>
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
        Sign in
      </Link>
    </Card>
  );
}
