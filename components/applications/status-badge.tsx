import { BadgeCheck, CalendarClock, Eye, Send, Star, XCircle } from "lucide-react";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

// Status is never conveyed by colour alone: every status has its own icon and a text label.
export const STATUS_ICON: Record<ApplicationStatus, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  applied: Send,
  under_review: Eye,
  shortlisted: Star,
  interview: CalendarClock,
  offered: BadgeCheck,
  rejected: XCircle,
};

/** Token-based colours, from the brief: text uses the status colour, the background is a 10% tint of it. */
export const STATUS_STYLE: Record<ApplicationStatus, string> = {
  applied: "bg-status-applied/10 text-status-applied-fg",
  under_review: "bg-status-review/10 text-status-review-fg",
  shortlisted: "bg-status-shortlisted/10 text-status-shortlisted-fg",
  interview: "bg-status-interview/10 text-status-interview-fg",
  offered: "bg-status-offered/10 text-status-offered-fg",
  rejected: "bg-status-rejected/10 text-status-rejected-fg",
};

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", STATUS_STYLE[status], className)}>
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
