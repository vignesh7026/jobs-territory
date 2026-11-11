"use client";

import { useState } from "react";
import { Check, FolderGit2, Loader2 } from "lucide-react";
import { scanPortfolio, type ScanResult } from "@/app/(app)/profile/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isGithubUsername } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type Found = Extract<ScanResult, { ok: true }>;

/**
 * Suggests skills from your public GitHub projects. It reads repository languages, topics and descriptions that GitHub
 * already shows to anyone (never your code), and only adds what you tick, to the form, for you to save.
 */
export function PortfolioScan({ username, skills, onAdd }: { username: string; skills: string[]; onAdd: (added: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());

  const name = username.trim();
  const valid = isGithubUsername(name);

  async function scan() {
    setBusy(true);
    setError("");
    const r = await scanPortfolio(name, skills);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setFound(r);
    setPick(new Set(r.skills.filter((s) => !s.onProfile).map((s) => s.skill)));
  }

  const fresh = found?.skills.filter((s) => !s.onProfile) ?? [];
  const known = found?.skills.filter((s) => s.onProfile) ?? [];

  return (
    <Card className="p-5" data-testid="portfolio-scan">
      <h2 className="inline-flex items-center gap-2 text-base">
        <FolderGit2 className="size-4" aria-hidden="true" /> Skills from your projects
      </h2>
      <p className="mt-2 text-sm text-muted">We read the languages, topics and descriptions of your public GitHub repositories to find skills your profile does not mention. Forks and archived repositories are skipped.</p>

      {!found && (
        <div className="mt-3 grid gap-2">
          <Button type="button" variant="secondary" onClick={scan} disabled={busy || !valid}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Reading" : valid ? `Scan ${name}` : "Add your GitHub username first"}
          </Button>
          {!valid && <p className="text-xs text-muted">Put it in the GitHub username field under Basics.</p>}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-fg">
          {error}
        </p>
      )}

      {found && (
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-muted">
            Read {found.repoCount} {found.repoCount === 1 ? "repository" : "repositories"}.
          </p>
          {fresh.length === 0 ? (
            <p className="text-sm">Nothing new: every skill we found is already on your profile.</p>
          ) : (
            <ul className="grid gap-1.5">
              {fresh.map((s) => (
                <li key={s.skill}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-2.5 text-sm md:min-h-9">
                    <input
                      type="checkbox"
                      checked={pick.has(s.skill)}
                      onChange={(e) =>
                        setPick((cur) => {
                          const next = new Set(cur);
                          if (e.target.checked) next.add(s.skill);
                          else next.delete(s.skill);
                          return next;
                        })
                      }
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="font-medium">{s.skill}</span>
                      <span className="block text-xs text-muted">
                        {s.count} {s.count === 1 ? "repository" : "repositories"}: {s.repos.join(", ")}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {known.length > 0 && (
            <p className="text-xs text-muted">
              <Check className="mr-1 inline size-3.5 align-text-bottom" aria-hidden="true" />
              Already on your profile: {known.map((k) => k.skill).join(", ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {fresh.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                disabled={pick.size === 0}
                onClick={() => {
                  onAdd(fresh.filter((s) => pick.has(s.skill)).map((s) => s.skill));
                  setFound(null);
                }}
              >
                Add {pick.size} to my skills
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setFound(null)}>
              {fresh.length > 0 ? "Discard" : "Close"}
            </Button>
          </div>
          <p className={cn("text-xs text-muted")}>Suggestions come from names and labels, not from judging your code. Only add what you could do in a work test.</p>
        </div>
      )}
    </Card>
  );
}
