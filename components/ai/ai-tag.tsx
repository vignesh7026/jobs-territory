import { Sparkles } from "lucide-react";

/** Marks text a model wrote, so nobody mistakes it for the employer's words or their own. */
export function AiTag({ label = "Written by AI" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Sparkles className="size-3.5" aria-hidden="true" /> {label}
    </span>
  );
}
