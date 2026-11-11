import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Render the control with the right id and aria attributes already applied. */
  children: (control: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode;
}

/** Label + control + hint + error, wired together for screen readers. Errors sit directly under the field. */
export function FormField({ id, label, error, hint, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
