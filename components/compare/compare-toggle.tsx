"use client";

import { Scale } from "lucide-react";
import { useCompare, type CompareItem } from "@/components/compare/compare-provider";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE } from "@/lib/compare";
import { cn } from "@/lib/utils";

/** Add or remove a job from the comparison (up to three). */
export function CompareToggle({ item, variant = "icon", className }: { item: CompareItem; variant?: "icon" | "button"; className?: string }) {
  const { has, toggle } = useCompare();
  const { toast } = useToast();
  const on = has(item.id);

  function onClick() {
    if (!toggle(item)) toast({ title: `You can compare up to ${MAX_COMPARE} jobs`, description: "Remove one from the comparison tray first.", tone: "error" });
  }

  if (variant === "button") {
    return (
      <Button variant="secondary" onClick={onClick} aria-pressed={on} className={className}>
        <Scale aria-hidden="true" /> {on ? "In comparison" : "Compare"}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${item.title} from comparison` : `Compare ${item.title}`}
      title={on ? "In comparison" : "Compare"}
      className={cn("grid size-11 place-items-center rounded-md transition-colors duration-fast hover:bg-primary-soft md:size-9", on ? "bg-primary-soft text-primary" : "text-muted hover:text-text", className)}
    >
      <Scale className="size-4" aria-hidden="true" />
    </button>
  );
}
