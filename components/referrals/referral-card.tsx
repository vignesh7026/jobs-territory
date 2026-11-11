"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Handshake } from "lucide-react";
import { addConnection, removeConnection } from "@/app/(app)/referrals/actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RELATIONSHIPS, draftReferralMessage, type Employee, type Relationship } from "@/lib/referral";
import type { Connection } from "@/lib/referral-queries";

const select = "h-11 rounded-md border border-border bg-surface px-2 text-sm md:h-10";

/**
 * Who could refer you here: alumni from your college, and people you know. Writing to them is up to you: the draft is
 * copied, never sent, and there are no contact details for colleagues on this site.
 */
export function ReferralCard({
  companyId, companyName, jobSlug, jobTitle, firstName, sharedSkills, alumni, connections, colleges, signedIn, loginHref,
}: {
  companyId: string; companyName: string; jobSlug: string; jobTitle: string; firstName: string; sharedSkills: string[];
  alumni: Employee[]; connections: Connection[]; colleges: string[]; signedIn: boolean; loginHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [rel, setRel] = useState<Relationship>("colleague");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Card className="p-5">
        <h2 className="inline-flex items-center gap-2 text-base">
          <Handshake className="size-4" aria-hidden="true" /> Who could refer you
        </h2>
        <p className="mt-2 text-sm text-muted">
          <Link href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>{" "}
          to see alumni from your college at {companyName}.
        </p>
      </Card>
    );
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it manually.", tone: "error" });
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await addConnection({ companyId, jobSlug, fullName: name, relationship: rel });
      if (r.ok) {
        setName("");
        setAdding(false);
        router.refresh();
      } else setError(r.message);
    });
  }

  const draftFor = (contactName: string, basis: Parameters<typeof draftReferralMessage>[0]["basis"]) => draftReferralMessage({ candidateFirstName: firstName, contactName, company: companyName, jobTitle, basis, sharedSkills });

  return (
    <Card className="p-5" data-testid="referrals">
      <h2 className="inline-flex items-center gap-2 text-base">
        <Handshake className="size-4" aria-hidden="true" /> Who could refer you
      </h2>

      <h3 className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">Alumni at {companyName}</h3>
      {alumni.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{colleges.length === 0 ? "Add your college to your profile and we will look for alumni here." : `No one from ${colleges[0]} is listed at ${companyName}.`}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {alumni.map((a) => {
            const text = draftFor(a.fullName, { kind: "alumni", college: a.college });
            return (
              <li key={a.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{a.fullName}</p>
                <p className="text-xs text-muted">
                  {a.title} &middot; {a.college}
                  {a.gradYear ? `, ${a.gradYear}` : ""}
                </p>
                <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id} className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  {open === a.id ? "Hide the message" : "Draft a message"}
                </button>
                {open === a.id && (
                  <div className="mt-2 grid gap-2">
                    <pre className="whitespace-pre-wrap rounded-md bg-bg p-3 font-sans text-sm leading-relaxed" data-testid="referral-draft">{text}</pre>
                    <Button type="button" variant="secondary" onClick={() => copy(a.id, text)}>
                      {copied === a.id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                      {copied === a.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">People you know here</h3>
      {connections.length > 0 && (
        <ul className="mt-2 grid gap-2">
          {connections.map((c) => {
            const text = draftFor(c.fullName, { kind: "know", relationship: c.relationship });
            return (
              <li key={c.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">
                  {c.fullName} <span className="font-normal text-muted">({c.relationship})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button type="button" onClick={() => copy(c.id, text)} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    {copied === c.id ? "Copied" : "Copy a message"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await removeConnection(c.id, jobSlug);
                        if (r.ok) router.refresh();
                        else toast({ title: r.message, tone: "error" });
                      })
                    }
                    className="text-sm text-muted underline-offset-4 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!adding ? (
        <Button type="button" variant="ghost" className="mt-2" onClick={() => setAdding(true)}>
          Add someone you know at {companyName}
        </Button>
      ) : (
        <form onSubmit={add} className="mt-3 grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="conn-name" className="text-sm font-medium">
              Their name
            </label>
            <Input id="conn-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="conn-rel" className="text-sm font-medium">
              How you know them
            </label>
            <select id="conn-rel" className={select} value={rel} onChange={(e) => setRel(e.target.value as Relationship)}>
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger-fg">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <p className="mt-4 text-xs text-muted">Only you can see the people you add. Messages are drafts for you to send yourself; nothing is sent from here.</p>
    </Card>
  );
}
