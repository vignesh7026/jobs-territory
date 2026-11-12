"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pause, Play, Rocket, ShieldCheck, Trash2 } from "lucide-react";
import { removeRule, runNow, saveRule, setEnabled } from "@/app/(app)/auto-apply/actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAILY_CAP_CHOICES, MIN_MATCH_CHOICES, parseTerms } from "@/lib/auto-apply";

const select = "h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10";

export interface PanelRule {
  roles: string[]; locations: string[]; includeRemote: boolean; minMatch: number; dailyCap: number; verifiedOnly: boolean; enabled: boolean;
}
export interface PanelPick { slug: string; title: string; company: string; location: string; score: number }
export interface PanelSent { id: string; slug: string; title: string; company: string; when: string; canUndo: boolean }

/**
 * Choose roles and places; the server applies for you within the limits set here. Everything automatic is listed
 * below with an undo while it is still allowed, and a pause switch stops it at once.
 */
export function AutoApplyPanel({ rule, notReady, picks, remainingToday, sent }: { rule: PanelRule | null; notReady: string | null; picks: PanelPick[]; remainingToday: number; sent: PanelSent[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [roles, setRoles] = useState((rule?.roles ?? []).join(", "));
  const [locations, setLocations] = useState((rule?.locations ?? []).join(", "));
  const [includeRemote, setIncludeRemote] = useState(rule?.includeRemote ?? false);
  const [minMatch, setMinMatch] = useState(rule?.minMatch ?? 60);
  const [dailyCap, setDailyCap] = useState(rule?.dailyCap ?? 3);
  const [verifiedOnly, setVerifiedOnly] = useState(rule?.verifiedOnly ?? true);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    start(async () => {
      const r = await saveRule({ roles: parseTerms(roles), locations: parseTerms(locations), includeRemote, minMatch, dailyCap, verifiedOnly, consent });
      if (r.ok) {
        toast({ title: r.message, tone: "success" });
        setConsent(false);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast({ title: r.message, tone: "error" });
      }
    });
  }

  const act = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast({ title: r.message, tone: r.ok ? "success" : "error" });
      router.refresh();
    });

  async function undo(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    toast(res?.ok ? { title: "Application withdrawn" } : { title: "Could not undo", description: body?.error ?? "Try again.", tone: "error" });
    router.refresh();
  }

  const err = (k: string) => errors[k] && <p className="text-sm text-danger-fg">{errors[k]}</p>;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <form onSubmit={save} noValidate className="grid gap-5" data-testid="auto-form">
        {notReady && (
          <p role="status" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            {notReady} <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">Open profile</Link>
          </p>
        )}

        <Card className="grid gap-4 p-5">
          <div className="grid gap-1.5">
            <label htmlFor="aa-roles" className="text-sm font-medium">Roles you want</label>
            <Input id="aa-roles" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="frontend developer, react developer" autoComplete="off" />
            <p className="text-xs text-muted">Separate with commas, up to 5. A job matches when its title contains every word of a role.</p>
            {err("roles")}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="aa-locations" className="text-sm font-medium">Locations</label>
            <Input id="aa-locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Coimbatore, Bengaluru" autoComplete="off" />
            {err("locations")}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
            <input type="checkbox" className="size-4" checked={includeRemote} onChange={(e) => setIncludeRemote(e.target.checked)} /> Also apply to remote jobs
          </label>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="aa-match" className="text-sm font-medium">Only jobs I match at least</label>
            <select id="aa-match" className={select} value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))}>
              {MIN_MATCH_CHOICES.map((n) => <option key={n} value={n}>{n}%</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="aa-cap" className="text-sm font-medium">Most applications per day</label>
            <select id="aa-cap" className={select} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))}>
              {DAILY_CAP_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="flex min-h-11 items-start gap-2 text-sm sm:col-span-2 md:min-h-0">
            <input type="checkbox" className="mt-0.5 size-4" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            <span>
              <span className="inline-flex items-center gap-1 font-medium"><ShieldCheck className="size-4" aria-hidden="true" /> Verified companies only</span>
              <span className="block text-xs text-muted">Recommended. Unverified companies are skipped.</span>
            </span>
          </label>
        </Card>

        <Card className="grid gap-3 p-5">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I want applications sent for me. Each goes in with my profile and resume and no cover note. I can undo one for 10 minutes and pause at any time.
            </span>
          </label>
          {err("consent")}
          <Button type="submit" variant="primary" size="lg" disabled={pending || Boolean(notReady)} className="justify-self-start">
            <Rocket className="size-4" aria-hidden="true" /> {rule ? "Save and run now" : "Turn on auto-apply"}
          </Button>
        </Card>
      </form>

      <div className="grid gap-4">
        {rule && (
          <Card className="p-5" data-testid="auto-status">
            <h2 className="text-base">{rule.enabled ? "Auto-apply is on" : "Auto-apply is paused"}</h2>
            <p className="mt-1 text-sm text-muted">
              {remainingToday} of {rule.dailyCap} left in the last 24 hours. Checked when you open this page or My Applications.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => act(() => setEnabled(!rule.enabled))}>
                {rule.enabled ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} {rule.enabled ? "Pause" : "Resume"}
              </Button>
              <Button type="button" variant="secondary" disabled={pending || !rule.enabled} onClick={() => act(runNow)}>Check now</Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => act(removeRule)}>
                <Trash2 className="size-4" aria-hidden="true" /> Remove
              </Button>
            </div>
          </Card>
        )}

        {rule && (
          <Card className="p-5" data-testid="auto-next">
            <h2 className="text-base">Next in line</h2>
            {picks.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nothing open matches your roles, places and match level right now.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {picks.map((p) => (
                  <li key={p.slug} className="text-sm">
                    <Link href={`/jobs/${p.slug}`} className="font-medium hover:text-primary">{p.title}</Link>
                    <span className="block text-xs text-muted">{p.company} &middot; {p.location} &middot; {p.score}% match</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card className="p-5" data-testid="auto-sent">
          <h2 className="text-base">Sent automatically</h2>
          {sent.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Nothing yet. Every automatic application will be listed here.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {sent.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <Link href={`/applications/${s.id}`} className="font-medium hover:text-primary">{s.title}</Link>
                    <span className="block text-xs text-muted">{s.company} &middot; {s.when}</span>
                  </span>
                  {s.canUndo && (
                    <button type="button" onClick={() => undo(s.id)} className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">Undo</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
