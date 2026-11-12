export const REASONS = {
  fake_company: "This looks like a fake company",
  asks_for_money: "It asks for money or personal documents",
  misleading: "The listing is misleading or outdated",
  abusive: "It is abusive or inappropriate",
  other: "Something else",
} as const;
export type Reason = keyof typeof REASONS;
export const REASON_KEYS = Object.keys(REASONS) as [Reason, ...Reason[]];
export const KIND_LABEL = { job: "Job listing", company: "Company", insight: "Interview note" } as const;
/** What "Take action" does for each kind, shown on the admin button so nobody guesses. */
export const ACTION_LABEL = { job: "Close the listing", company: "Remove verification", insight: "Hide the note" } as const;
