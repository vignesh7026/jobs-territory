// Peer interview insights: stats and the plain (non-AI) summary. Pure, so tested without a database.

export type Outcome = "offer" | "rejected" | "no_answer" | "withdrew";
export const OUTCOMES: Outcome[] = ["offer", "rejected", "no_answer", "withdrew"];
export const OUTCOME_LABEL: Record<Outcome, string> = { offer: "Got an offer", rejected: "Rejected", no_answer: "Never heard back", withdrew: "Withdrew" };

export interface Insight {
  id: string;
  roleTitle: string;
  rounds: number;
  difficulty: number;
  outcome: Outcome;
  experience: string;
  isSample: boolean;
  createdAt: string;
  mine: boolean;
}

export interface InsightStats {
  count: number;
  samples: number;
  avgDifficulty: number | null;
  medianRounds: number | null;
  outcomes: Record<Outcome, number>;
}

export function insightStats(rows: Pick<Insight, "rounds" | "difficulty" | "outcome" | "isSample">[]): InsightStats {
  const outcomes: Record<Outcome, number> = { offer: 0, rejected: 0, no_answer: 0, withdrew: 0 };
  for (const r of rows) outcomes[r.outcome] += 1;
  if (rows.length === 0) return { count: 0, samples: 0, avgDifficulty: null, medianRounds: null, outcomes };
  const rounds = rows.map((r) => r.rounds).sort((a, b) => a - b);
  const mid = Math.floor(rounds.length / 2);
  const medianRounds = rounds.length % 2 ? rounds[mid] : (rounds[mid - 1] + rounds[mid]) / 2;
  const avgDifficulty = Math.round((rows.reduce((a, r) => a + r.difficulty, 0) / rows.length) * 10) / 10;
  return { count: rows.length, samples: rows.filter((r) => r.isSample).length, avgDifficulty, medianRounds, outcomes };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Three plain lines from the numbers alone. Never claims anything the notes do not say. */
export function plainInsightSummary(s: InsightStats): string[] {
  if (s.count === 0) return ["No interview notes for this company yet.", "Applied here? You can share what the process was like.", "Notes are anonymous."];
  const l1 = `${plural(s.count, "note", "notes")} from candidates${s.samples > 0 ? ` (${s.samples} ${s.samples === 1 ? "is a sample" : "are samples"})` : ""}.`;
  const l2 = `Typically ${s.medianRounds} ${s.medianRounds === 1 ? "round" : "rounds"}, difficulty ${s.avgDifficulty} out of 5.`;
  const parts = OUTCOMES.filter((o) => s.outcomes[o] > 0).map((o) => `${s.outcomes[o]} ${OUTCOME_LABEL[o].toLowerCase()}`);
  return [l1, l2, `Outcomes: ${parts.join(", ")}.`];
}
