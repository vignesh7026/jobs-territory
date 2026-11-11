import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-muted md:h-10 md:text-sm",
      "transition-colors duration-fast hover:border-muted/60 aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
