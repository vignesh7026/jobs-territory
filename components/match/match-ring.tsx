"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const R = 42;
const C = 2 * Math.PI * R;

/**
 * Score ring. The arc draws to its value once and the number counts up once, on first paint.
 * Reduced motion: shows the final value immediately. The tier label next to it carries the meaning, not the colour.
 */
export function MatchRing({ score, size = 96, className }: { score: number; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  // Server and first client render must agree, so both start at 0; reduced motion just runs a zero-length animation.
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, { duration: reduce ? 0 : 0.9, ease, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [score, reduce]);

  return (
    <div role="img" aria-label={`Match score: ${score} out of 100`} className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" className="stroke-border" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease }}
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-heading text-2xl font-bold tabular-nums">
        {shown}
      </span>
    </div>
  );
}
