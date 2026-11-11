"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/motion";
import type { StrengthItem } from "@/lib/profile-strength";

/** Score bar plus the single next action. Only transform/opacity animate (scaleX from the left edge). */
export function StrengthMeter({ score, next }: { score: number; next: StrengthItem | null }) {
  const reduce = useReducedMotion();
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base">Profile strength</h2>
        <p className="text-2xl font-heading font-bold tabular-nums" aria-hidden="true">
          {score}%
        </p>
      </div>
      <div role="progressbar" aria-label="Profile strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <motion.div className="h-full origin-left rounded-full bg-primary" initial={false} animate={{ scaleX: score / 100 }} transition={reduce ? { duration: 0 } : t.slow} style={{ width: "100%" }} />
      </div>
      {next ? (
        <a href={`#${next.anchor}`} className="mt-3 flex items-start gap-2 rounded-md bg-primary-soft p-2.5 text-sm text-text transition-colors duration-fast hover:bg-primary-soft/70">
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block text-xs font-medium text-muted">Next best step, up to +{next.weight - next.earned} points</span>
            {next.action}
          </span>
        </a>
      ) : (
        <p className="mt-3 rounded-md bg-primary-soft p-2.5 text-sm">Your profile is complete. Keep your skills current as you learn new ones.</p>
      )}
    </Card>
  );
}
