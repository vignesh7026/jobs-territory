// Application statuses: one place for the order, the labels and the allowed moves.

export const STATUSES = ["applied", "under_review", "shortlisted", "interview", "offered", "rejected"] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
};

/** The forward path a successful application takes. 'rejected' can happen at any point and is terminal. */
export const PIPELINE = ["applied", "under_review", "shortlisted", "interview", "offered"] as const satisfies readonly ApplicationStatus[];

/** Mirrors the database function application_transition_allowed(). */
const NEXT: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  applied: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["rejected"],
  rejected: [],
};

export const allowedNext = (from: ApplicationStatus): readonly ApplicationStatus[] => NEXT[from];
export const canMove = (from: ApplicationStatus, to: ApplicationStatus) => NEXT[from].includes(to);
export const isTerminal = (s: ApplicationStatus) => NEXT[s].length === 0;
export const isStatus = (v: string): v is ApplicationStatus => (STATUSES as readonly string[]).includes(v);

/** An application can be withdrawn only while untouched ('applied') and under ten minutes old. Mirrors undo_application(). */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;
export function isUndoable(status: ApplicationStatus, createdAtIso: string, now: Date = new Date()): boolean {
  return status === "applied" && now.getTime() - new Date(createdAtIso).getTime() < UNDO_WINDOW_MS;
}
