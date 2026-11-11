"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Only rendered while the application is brand new and untouched (the database enforces the same rule). */
export function WithdrawButton({ applicationId, jobTitle }: { applicationId: string; jobTitle: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    const res = await fetch(`/api/applications/${applicationId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setOpen(false);
    if (res?.ok) {
      toast({ title: "Application withdrawn", description: jobTitle, tone: "success" });
      router.push("/applications");
      router.refresh();
    } else {
      const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      toast({ title: "Could not withdraw", description: body?.error ?? "Try again in a moment.", tone: "error" });
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Undo2 aria-hidden="true" /> Withdraw application
      </Button>
      <ConfirmDialog
        open={open}
        title="Withdraw this application?"
        description="It is removed completely. You can apply again later if the job is still open. This is only possible within 10 minutes of applying, before anyone has reviewed it."
        confirmLabel="Withdraw"
        busy={busy}
        onConfirm={withdraw}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
