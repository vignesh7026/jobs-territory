"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/applications/status-badge";
import { useToast } from "@/components/shell/toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { burst } from "@/lib/confetti";
import { t } from "@/lib/motion";
import type { ApplicationStatus } from "@/lib/applications/status";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ApplyJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  closed: boolean;
  salary: string;
  closesInDays: number | null;
}
interface Applied {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
}
interface Props {
  job: ApplyJob;
  signedIn: boolean;
  resumeName: string | null;
  initialApplication: Applied | null;
}

type SendResult = { ok: true; id: string } | { ok: false; message: string; fieldError?: string };

export function ApplyController({ job, signedIn, resumeName, initialApplication }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const [application, setApplication] = useState<Applied | null>(initialApplication);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const loginHref = `/login?next=${encodeURIComponent(`/jobs/${job.slug}`)}`;

  async function send(coverNote: string): Promise<SendResult> {
    try {
      const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id, coverNote }) });
      const body = (await res.json().catch(() => ({}))) as { id?: string; status?: ApplicationStatus; createdAt?: string; error?: string; fieldErrors?: Record<string, string> };

      if (res.status === 201 && body.id) {
        setApplication({ id: body.id, status: body.status ?? "applied", createdAt: body.createdAt ?? new Date().toISOString() });
        return { ok: true, id: body.id };
      }
      if (res.status === 401) {
        router.push(loginHref);
        return { ok: false, message: "Your session expired. Sign in to apply." };
      }
      if (res.status === 409) {
        router.refresh(); // pick up the existing application from the server
        return { ok: false, message: "You have already applied to this job." };
      }
      if (res.status === 410) {
        router.refresh();
        return { ok: false, message: body.error ?? "This job is no longer accepting applications." };
      }
      return { ok: false, message: body.error ?? "We could not send your application. Try again.", fieldError: body.fieldErrors?.coverNote };
    } catch {
      return { ok: false, message: "We could not reach the server. Check your connection and try again." };
    }
  }

  function celebrate(createdId: string) {
    // Confetti comes from whichever apply control is on screen; then an undo toast.
    const el = [cardRef.current, barRef.current].find((n) => n && n.offsetParent !== null);
    const r = el?.getBoundingClientRect();
    burst(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    toast({
      title: "Application sent",
      description: `${job.title} at ${job.company}`,
      tone: "success",
      action: { label: "Undo", onClick: () => undo(createdId) },
    });
    router.refresh();
  }

  async function undo(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setApplication(null);
      toast({ title: "Application withdrawn", description: "You can apply again whenever you like." });
      router.refresh();
    } else {
      const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      toast({ title: "Could not undo", description: body?.error ?? "Try again in a moment.", tone: "error" });
    }
  }

  /** The control for the current state, shared by the desktop card and the mobile bar. */
  function action(compact: boolean) {
    if (application) {
      return (
        <motion.div initial={reduce ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 22 }} className={cn("flex items-center gap-3", compact && "justify-between")}>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Check className="size-4 text-success" aria-hidden="true" /> Applied {timeAgo(application.createdAt).toLowerCase()}
            </p>
            {!compact && <StatusBadge status={application.status} className="mt-2" />}
          </div>
          <Link href="/applications" className={buttonVariants({ variant: "secondary", size: compact ? "sm" : "default" })}>
            View status
          </Link>
        </motion.div>
      );
    }
    if (job.closed) {
      return (
        <Button variant="secondary" disabled className="w-full">
          Applications closed
        </Button>
      );
    }
    if (!signedIn) {
      return (
        <Link href={loginHref} className={cn(buttonVariants({ variant: "primary", size: compact ? "default" : "lg" }), "w-full")}>
          Sign in to apply
        </Link>
      );
    }
    return (
      <Button variant="primary" size={compact ? "default" : "lg"} className="w-full" onClick={() => setOpen(true)}>
        Apply now
      </Button>
    );
  }

  const closing = job.closesInDays;
  return (
    <>
      {/* Desktop: a card beside the description. */}
      <Card ref={cardRef} className="hidden p-5 lg:block">
        <p className="text-xs font-medium text-muted">Salary</p>
        <p className="mt-0.5 text-xl font-heading font-bold tabular-nums">{job.salary}</p>
        {closing !== null && !job.closed && <p className={cn("mt-2 text-sm", closing <= 7 ? "text-warning" : "text-muted")}>{closing === 0 ? "Closes today" : `Closes in ${closing} ${closing === 1 ? "day" : "days"}`}</p>}
        <div className="mt-4">{action(false)}</div>
        {signedIn && !application && !job.closed && <p className="mt-3 text-xs text-muted">{resumeName ? `Your resume (${resumeName}) is attached.` : "You have no resume on file."}</p>}
      </Card>

      {/* Phones: a bar pinned to the bottom so Apply is always one tap away. */}
      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="container flex items-center gap-3 px-0">
          {!application && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium tabular-nums">{job.salary}</p>
              {closing !== null && !job.closed && <p className="text-xs text-muted">{closing === 0 ? "Closes today" : `Closes in ${closing}d`}</p>}
            </div>
          )}
          <div className={cn(application ? "w-full" : "w-40 shrink-0")}>{action(true)}</div>
        </div>
      </div>

      <ApplyDialog open={open} onClose={() => setOpen(false)} job={job} resumeName={resumeName} send={send} onSent={celebrate} />
    </>
  );
}

// ------------------------------------------------------------------ dialog

type Phase = "idle" | "sending" | "sent";

function ApplyDialog({ open, onClose, job, resumeName, send, onSent }: { open: boolean; onClose: () => void; job: ApplyJob; resumeName: string | null; send: (note: string) => Promise<SendResult>; onSent: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const reduce = useReducedMotion();

  // Open/close the native <dialog> (focus trap and Esc come with it).
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "idle") return;
    setError(undefined);
    setFieldError(undefined);
    setPhase("sending");
    const result = await send(note.trim());
    if (!result.ok) {
      setPhase("idle"); // the note stays exactly as typed
      setError(result.message);
      setFieldError(result.fieldError);
      return;
    }
    setPhase("sent");
    const id = result.id;
    window.setTimeout(() => {
      onClose();
      onSent(id);
      setPhase("idle");
      setNote("");
    }, reduce ? 150 : 650);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (phase === "idle") onClose();
      }}
      onClick={(e) => e.target === ref.current && phase === "idle" && onClose()}
      aria-labelledby="apply-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-text/40"
    >
      <form onSubmit={submit} className="grid gap-4 p-5">
        <div>
          <h2 id="apply-title" className="text-xl">
            Apply to {job.company}
          </h2>
          <p className="mt-1 text-sm text-muted">{job.title}</p>
        </div>

        <div className="rounded-md border border-border bg-bg p-3 text-sm">
          {resumeName ? (
            <p>
              <span className="font-medium">Resume:</span> {resumeName}
            </p>
          ) : (
            <p>
              <span className="font-medium">No resume on file.</span> You can still apply, but many employers expect one.{" "}
              <Link href="/profile#resume" className="text-primary underline-offset-4 hover:underline">
                Add a resume
              </Link>
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="coverNote" className="text-sm font-medium">
            Cover note <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea id="coverNote" rows={6} value={note} onChange={(e) => setNote(e.target.value)} maxLength={3000} aria-invalid={Boolean(fieldError)} aria-describedby="coverNote-hint" placeholder="Two or three sentences on why this role and why you." />
          <p id="coverNote-hint" className={cn("text-xs", fieldError ? "text-danger" : "text-muted")}>
            {fieldError ?? `${note.length} of 3000 characters`}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={phase !== "idle"}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={phase !== "idle"} className="min-w-40">
            {/* The label morphs: Send -> progress -> check. Only the check uses a spring. */}
            <AnimatePresence mode="wait" initial={false}>
              {phase === "idle" && (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t.fast}>
                  Send application
                </motion.span>
              )}
              {phase === "sending" && (
                <motion.span key="sending" className="inline-flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t.fast}>
                  <Loader2 className="animate-spin" aria-hidden="true" /> Sending
                </motion.span>
              )}
              {phase === "sent" && (
                <motion.span key="sent" className="inline-flex items-center gap-2" initial={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={reduce ? t.fast : { type: "spring", stiffness: 420, damping: 18 }}>
                  <Check aria-hidden="true" /> Sent
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </form>
    </dialog>
  );
}
