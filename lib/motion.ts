"use client";

import { useReducedMotion, type Transition, type Variants } from "framer-motion";

/** Shared timing. Functional motion only: 150-300 ms, ease-out. */
export const ease = [0.16, 1, 0.3, 1] as const;
export const t = {
  fast: { duration: 0.15, ease } satisfies Transition,
  base: { duration: 0.2, ease } satisfies Transition,
  slow: { duration: 0.3, ease } satisfies Transition,
};

/** Route / section entrance: 200 ms fade + 8 px slide. With reduced motion: fade only. */
export function useEnter(): { variants: Variants; initial: string; animate: string } {
  const reduce = useReducedMotion();
  return {
    variants: {
      hidden: { opacity: 0, y: reduce ? 0 : 8 },
      show: { opacity: 1, y: 0, transition: t.base },
    },
    initial: "hidden",
    animate: "show",
  };
}
