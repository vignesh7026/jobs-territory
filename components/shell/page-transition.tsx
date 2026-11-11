"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { MORPH_ATTR } from "@/lib/morph";
import { t } from "@/lib/motion";

/**
 * Page content: 200 ms fade and 8 px rise on every route change, transform and opacity only. Keyed by pathname, so a
 * change of page replays it, while filters and pagination (same pathname) do not. With reduced motion: fade only.
 * It skips itself when the navigation carries a shared-element morph (job row <-> job page): the view transition owns the
 * motion then, and a fading ancestor would hide the morph's target.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [skip] = useState(() => typeof document !== "undefined" && document.documentElement.hasAttribute(MORPH_ATTR)); // read when this page first renders
  return (
    <motion.div key={pathname} initial={skip ? false : { opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={t.base}>
      {children}
    </motion.div>
  );
}
