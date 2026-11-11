import { cn } from "@/lib/utils";

/** Every list needs an empty state with a next action. Left-aligned, no illustration. */
export function EmptyState({ icon, title, description, children, className }: { icon?: React.ReactNode; title: string; description: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border bg-surface p-8", className)}>
      {icon && <div className="mb-3 text-muted [&_svg]:size-6">{icon}</div>}
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">{description}</p>
      {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
