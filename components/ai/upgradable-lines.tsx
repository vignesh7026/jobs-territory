"use client";

import { useEffect, useState } from "react";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi } from "@/components/ai/use-ai";
import { cn } from "@/lib/utils";

/**
 * Shows the plain, always-correct lines immediately. If the model produces a better version it replaces them, tagged
 * as AI-written, with a way to go back. If the model fails, nothing changes and nothing is shown about it.
 */
export function UpgradableLines({
  kind,
  body,
  plain,
  enabled,
  className,
  mutedSecondLine,
  testId,
}: {
  kind: "match" | "summary";
  body: Record<string, string>;
  plain: string[];
  /** only signed-in visitors can use the AI routes */
  enabled: boolean;
  className?: string;
  /** style every line after the first as secondary text (a boolean, because functions cannot cross from server to client components) */
  mutedSecondLine?: boolean;
  testId?: string;
}) {
  const [ai, setAi] = useState<string[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const key = JSON.stringify(body);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    postAi<{ lines: string[] }>(kind, JSON.parse(key) as Record<string, string>)
      .then((r) => alive && isAi(r.source) && setAi(r.data.lines))
      .catch(() => {
        /* keep the plain version */
      });
    return () => {
      alive = false;
    };
  }, [enabled, kind, key]);

  const showAi = ai !== null && !dismissed;
  const lines = showAi ? ai : plain;

  return (
    <div className={className} data-testid={testId} data-source={showAi ? "ai" : "plain"}>
      {lines.map((l, i) => (
        <p key={`${showAi}-${i}`} className={cn(mutedSecondLine && i === 1 && "text-muted")}>
          {l}
        </p>
      ))}
      {ai !== null && (
        <div className="mt-2 flex items-center justify-between gap-3">
          {showAi ? <AiTag /> : <span className="text-xs text-muted">Plain version</span>}
          <button type="button" onClick={() => setDismissed((d) => !d)} className="text-xs text-primary underline-offset-4 hover:underline">
            {showAi ? "Use plain version" : "Show AI version"}
          </button>
        </div>
      )}
    </div>
  );
}
