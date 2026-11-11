// Command palette: what can be run, and how typed text ranks the list. Pure, so it is easy to test.

export interface Command {
  id: string;
  label: string;
  /** extra words that should match, e.g. "profile" for "My account" */
  keywords?: string;
  group: "Go to" | "Search" | "Saved searches" | "Applications" | "Actions";
  hint?: string;
  /** where it navigates; commands without an href run an action instead */
  href?: string;
}

/**
 * Score for how well a query matches a command (higher is better, 0 means no match).
 * Order of preference: exact label, label starts with it, a word in the label starts with it, label contains it,
 * keywords contain it, all letters appear in order (loose match).
 */
export function scoreCommand(query: string, c: Pick<Command, "label" | "keywords">): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const label = c.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/[\s\-/]+/).some((w) => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  if ((c.keywords ?? "").toLowerCase().includes(q)) return 30;
  let i = 0;
  for (const ch of label) if (ch === q[i]) i++;
  return i === q.length && q.length >= 2 ? 10 : 0;
}

export function filterCommands<T extends Pick<Command, "label" | "keywords">>(commands: T[], query: string): T[] {
  return commands
    .map((c, order) => ({ c, s: scoreCommand(query, c), order }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((x) => x.c);
}
