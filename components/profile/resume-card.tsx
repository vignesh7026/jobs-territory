"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/shell/toaster";
import { validateResumeFile } from "@/lib/validation/profile";

export interface ResumeState {
  name: string;
}

export function ResumeCard({ resume, onChange }: { resume: ResumeState | null; onChange: (r: ResumeState | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);

  async function upload(file: File) {
    setError(undefined);
    const problem = validateResumeFile(file); // same rules as the server; the server re-checks
    if (problem) return setError(problem);

    setBusy("upload");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/resume", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
      if (!res.ok || !json.name) return setError(json.error ?? "Upload failed. Try again.");
      onChange({ name: json.name });
      toast({ title: "Resume uploaded", tone: "success" });
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (!res.ok) return setError("We could not remove your resume. Try again.");
      onChange(null);
      toast({ title: "Resume removed" });
    } finally {
      setBusy(null);
      setConfirm(false);
    }
  }

  return (
    <Card id="resume" className="scroll-mt-24 p-4">
      <h2 className="text-base">Resume</h2>
      <p className="mt-1 text-sm text-muted">PDF, up to 2 MB. Recruiters see the version you had when you applied.</p>

      {resume ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-bg p-3">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{resume.name}</p>
            <a href="/api/resume" target="_blank" rel="noopener" className="text-xs text-primary underline-offset-4 hover:underline">
              Open
            </a>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setConfirm(true)} disabled={busy !== null} aria-label="Remove resume" className="text-danger hover:bg-danger/10">
            <Trash2 />
          </Button>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-muted">No resume yet. Many employers will not review an application without one.</p>
      )}

      <input ref={input} id="resume-file" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} aria-describedby={error ? "resume-error" : undefined} />
      <Button variant="secondary" className="mt-3 w-full" onClick={() => input.current?.click()} disabled={busy !== null}>
        {busy === "upload" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {busy === "upload" ? "Uploading" : resume ? "Replace PDF" : "Upload PDF"}
      </Button>
      {error && (
        <p id="resume-error" role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirm}
        title="Remove your resume?"
        description="The file is deleted and cannot be recovered. You can upload a new one at any time."
        confirmLabel="Remove resume"
        busy={busy === "remove"}
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}
