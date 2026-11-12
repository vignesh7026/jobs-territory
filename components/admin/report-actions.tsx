"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReport } from "@/app/(app)/admin/reports/actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";

export function ReportActions({ reportId, actionLabel }: { reportId: string; actionLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const go = (action: "dismiss" | "action") =>
    start(async () => {
      const r = await resolveReport({ reportId, action });
      toast({ title: r.ok ? (action === "action" ? "Action taken" : "Report dismissed") : r.message, tone: r.ok ? "success" : "error" });
      router.refresh();
    });
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="primary" disabled={pending} onClick={() => go("action")}>{actionLabel}</Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => go("dismiss")}>Dismiss</Button>
    </div>
  );
}
