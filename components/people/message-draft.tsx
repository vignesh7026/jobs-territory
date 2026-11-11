"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** An editable first message. Nothing is sent from here: copy it, or open it in your own mail app. */
export function MessageDraft({ initial, subject, to }: { initial: string; subject: string; to: string }) {
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text is still selectable in the box */
    }
  }

  return (
    <div className="grid gap-3">
      <label htmlFor="draft" className="text-sm font-medium">
        Your first message
      </label>
      <Textarea id="draft" value={text} onChange={(e) => setText(e.target.value)} rows={9} className="text-sm" />
      <div className="flex flex-wrap gap-2">
        <a
          href={`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors duration-fast hover:bg-primary-hover"
        >
          <Mail className="size-4" aria-hidden="true" /> Open in your mail app
        </a>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted">Built from your profile and this job. Edit it freely; nothing is sent until you send it.</p>
    </div>
  );
}
