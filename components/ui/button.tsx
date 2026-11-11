import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// One primary button per view. Touch target is 44 px on mobile, 40 px from md up.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-fast ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary: "border border-border bg-surface text-text hover:bg-primary-soft",
        ghost: "text-text hover:bg-primary-soft",
        danger: "border border-danger/40 bg-surface text-danger hover:bg-danger/10",
        link: "h-auto min-h-0 px-0 text-primary underline-offset-4 hover:underline md:h-auto",
      },
      size: {
        default: "h-11 px-4 md:h-10",
        sm: "h-11 px-3 md:h-8",
        lg: "h-12 px-6 text-base md:h-11",
        icon: "size-11 md:size-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
