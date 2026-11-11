import * as React from "react";
import { cn } from "@/lib/utils";

/** Cards use a 1 px border. The soft shadow appears on hover only (set `interactive`). */
export function Card({ className, interactive, ...props }: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface text-text",
        interactive && "transition-shadow duration-base ease-out hover:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
