"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changeApplicationStatus } from "@/app/(app)/admin/actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS, allowedNext, isTerminal, type ApplicationStatus } from "@/lib/applications/status";

/** Admin control: pick the next status, add an optional note. Only legal moves are offered. */
export function AdminStatusPanel({ applicationId, status, candidateName }: { applicationId: string; status: ApplicationStatus; candidateName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const options = allowedNext(status);
  const [next, setNext] = useState<ApplicationStatus | "">(options.find((o) => o !== "rejected") ?? "");
  const [note, setNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [pending, start] = useTransition();

  if (isTerminal(status)) {
    return (
      <Card className="p-5">
        <h2 className="text-base">Admin</h2>
        <p className="mt-2 text-sm text-muted">This application is {STATUS_LABELS[status].toLowerCase()}. That is a final status and cannot be changed.</p>
      </Card>
    );
  }

  function submit(target: ApplicationStatus) {
    start(async () => {
      const result = await changeApplicationStatus({ applicationId, status: target, note: note.trim() || undefined });
      if (result.ok) {
        toast({ title: `Moved to ${STATUS_LABELS[target].toLowerCase()}`, description: candidateName, tone: "success" });
        setNote("");
        const forward = allowedNext(target).find((o) => o !== "rejected");
        setNext(forward ?? "");
      } else {
        toast({ title: "Not changed", description: result.message, tone: "error" });
      }
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <h2 className="text-base">Admin: change status</h2>
      <p className="mt-1 text-sm text-muted">Currently {STATUS_LABELS[status].toLowerCase()}. The candidate sees the new status and your note.</p>

      <form
        className="mt-4 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (next === "rejected") setConfirmReject(true);
          else if (next) submit(next);
        }}
      >
        <fieldset className="grid gap-1">
          <legend className="mb-1 text-sm font-medium">Move to</legend>
          {options.map((o) => (
            <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-primary-soft md:min-h-9">
              <input type="radio" name="next" value={o} checked={next === o} onChange={() => setNext(o)} className="size-4 accent-[var(--primary)]" />
              {STATUS_LABELS[o]}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-1.5">
          <label htmlFor="admin-note" className="text-sm font-medium">
            Note to the candidate <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea id="admin-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="For example: Interview with the mobile lead on Thursday at 3 pm." />
        </div>

        <Button type="submit" variant={next === "rejected" ? "danger" : "primary"} disabled={!next || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {next ? `Update to ${STATUS_LABELS[next].toLowerCase()}` : "Choose a status"}
        </Button>
      </form>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this application?"
        description={`${candidateName} will be told their application was not successful. Rejection is final and cannot be undone.`}
        confirmLabel="Reject application"
        busy={pending}
        onConfirm={() => {
          setConfirmReject(false);
          submit("rejected");
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </Card>
  );
}
