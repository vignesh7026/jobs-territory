import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5", {
  variants: {
    variant: {
      neutral: "border border-border bg-bg text-muted",
      primary: "bg-primary-soft text-primary",
      success: "bg-success/10 text-success-fg",
      warning: "bg-warning/10 text-warning-fg",
      danger: "bg-danger/10 text-danger-fg",
      info: "bg-info/10 text-info-fg",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
