"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { Check, Loader2, MousePointer2, RotateCcw, Search } from "lucide-react";
import { StatusBadge } from "@/components/applications/status-badge";
import { CompanyMark } from "@/components/jobs/job-row";
import { MatchRing } from "@/components/match/match-ring";
import type { ApplicationStatus } from "@/lib/applications/status";
import { ease, t } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * A miniature of the product, in the product's own parts (match ring, status badge, company mark) with the real
 * tokens, so it can't drift from the app. It plays once when it scrolls into view and then rests on its last frame,
 * which is also the poster: reduced motion, no JavaScript and the first paint all show the finished state.
 * The story, about 12 s: search -> pick a job -> apply -> watch the status move. Every movement has a cause: the
 * cursor goes where the next thing happens, the list gives way to the page that row opens, the timeline fills as
 * the admin acts. The whole thing is decoration for sighted users, so it is hidden from assistive tech and inert.
 */

type Beat = { step: 0 | 1 | 2 | 3; sub: number };
const FINAL: Beat = { step: 3, sub: 2 };

// [ms from start, beat]. Steps: 0 list, 1 row chosen, 2 apply, 3 tracking.
const SCRIPT: [number, Beat][] = [
  [0, { step: 0, sub: 0 }],
  [1100, { step: 0, sub: 1 }], // results arrive
  [2600, { step: 1, sub: 0 }], // cursor goes to the best match
  [3900, { step: 2, sub: 0 }], // its page opens
  [5200, { step: 2, sub: 1 }], // cursor on Apply
  [6000, { step: 2, sub: 2 }], // pressed: progress
  [6900, { step: 2, sub: 3 }], // applied
  [8200, { step: 3, sub: 0 }], // tracking view, Applied
  [9300, { step: 3, sub: 1 }], // Under review
  [10500, { step: 3, sub: 2 }], // Shortlisted
];

const TRACK: ApplicationStatus[] = ["applied", "under_review", "shortlisted"];

const RESULTS = [
  { title: "Frontend Engineer, Patient App", company: "Tamarind Health", meta: "Chennai · Hybrid · ₹14.2–20.8 LPA", score: 78 },
  { title: "React Native Developer", company: "Aster Mobility", meta: "Bengaluru · Hybrid · ₹12.6–18.4 LPA", score: 64 },
  { title: "Web Developer, Storefront", company: "Basil Commerce", meta: "Remote · ₹9.8–14.2 LPA", score: 52 },
];

export function ProductDemo() {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { once: true, amount: 0.5 });
  const [beat, setBeat] = useState<Beat>(FINAL);
  const [run, setRun] = useState(0); // bumps on replay
  const [played, setPlayed] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [cursorOn, setCursorOn] = useState(false);

  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  const play = useCallback(() => {
    clear();
    setPlayed(true);
    setCursorOn(true);
    SCRIPT.forEach(([ms, b]) => timers.current.push(window.setTimeout(() => setBeat(b), ms)));
    timers.current.push(window.setTimeout(() => setCursorOn(false), SCRIPT[SCRIPT.length - 1][0] + 700));
  }, []);

  // Start once, when it is on screen, unless the visitor asked for less motion.
  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setTimeout(play, 0);
    return () => window.clearTimeout(id);
  }, [inView, reduce, play]);
  useEffect(() => clear, []);

  // The cursor goes to whatever the current beat is about. Positions are measured, so it stays right at any width.
  useEffect(() => {
    if (!cursorOn || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    const at = (el: HTMLElement | null, fx = 0.5, fy = 0.5) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width * fx, y: r.top - box.top + r.height * fy };
    };
    let target: { x: number; y: number } | null = null;
    if (beat.step === 0) target = at(searchRef.current, 0.55, 0.5);
    else if (beat.step === 1) target = at(rowRef.current, 0.7, 0.45);
    else if (beat.step === 2) target = at(applyRef.current, 0.5, 0.5) ?? { x: box.width * 0.5, y: box.height * 0.8 };
    else target = { x: box.width * 0.86, y: box.height * 0.9 };
    if (!target) return;
    const opts = { duration: 0.7, ease };
    const a = animate(x, target.x, opts);
    const b = animate(y, target.y, opts);
    return () => {
      a.stop();
      b.stop();
    };
  }, [beat, cursorOn, x, y]);

  const replay = () => {
    x.set(80);
    y.set(30);
    setBeat({ step: 0, sub: 0 });
    setRun((n) => n + 1);
    play();
  };

  const showList = beat.step <= 1;
  const resultsIn = beat.step > 0 || beat.sub >= 1;
  const applied = beat.step > 2 || (beat.step === 2 && beat.sub >= 3);
  const pressing = beat.step === 2 && beat.sub === 2;
  const trackIndex = beat.step === 3 ? beat.sub : -1;
  const current: ApplicationStatus = TRACK[Math.max(trackIndex, 0)];

  return (
    <figure className="m-0">
      <div aria-hidden="true" inert className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* Window chrome: an address field and nothing else. Three coloured dots would be decoration. */}
        <div className="flex items-center gap-3 border-b border-border bg-bg px-4 py-2.5">
          <span className="h-2 w-10 rounded-full bg-border" />
          <span className="truncate rounded-md border border-border bg-surface px-3 py-1 text-xs text-muted">jobsterritory.app/{showList ? "jobs" : "jobs/frontend-engineer-patient-app"}</span>
        </div>

        <div ref={stage} className="relative h-[22rem] overflow-hidden p-4">
          <AnimatePresence mode="wait" initial={false}>
            {showList ? (
              <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={t.base}>
                <div ref={searchRef} className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <Search className="size-4 text-muted" />
                  <span>react developer</span>
                  <span className="ml-auto text-xs text-muted">{resultsIn ? "3 jobs" : ""}</span>
                </div>
                <ul className="mt-3 grid gap-2">
                  {RESULTS.map((r, i) => (
                    <motion.li
                      key={`${run}-${r.title}`}
                      initial={played && !resultsIn ? { opacity: 0, y: 8 } : false}
                      animate={{ opacity: 1, y: beat.step === 1 && i === 0 ? -2 : 0 }}
                      transition={{ ...t.base, delay: resultsIn && beat.step === 0 ? i * 0.04 : 0 }}
                    >
                      <div
                        ref={i === 0 ? rowRef : undefined}
                        className={cn("flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-shadow duration-150", beat.step === 1 && i === 0 && "shadow-soft")}
                      >
                        <CompanyMark name={r.company} className="size-9 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.title}</p>
                          <p className="truncate text-xs text-muted">
                            {r.company} · {r.meta}
                          </p>
                        </div>
                        <span className="text-right">
                          <span className="block font-heading text-base font-bold leading-none">{r.score}</span>
                          <span className="text-[11px] text-muted">match</span>
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={t.base} className="grid gap-3">
                <div className="flex items-center gap-3">
                  <CompanyMark name="Tamarind Health" className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">Frontend Engineer, Patient App</p>
                    <p className="text-xs text-muted">Tamarind Health · Chennai · Hybrid</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3">
                  <MatchRing key={`ring-${run}`} score={78} size={56} />
                  <div className="min-w-0 text-xs leading-relaxed">
                    <p className="text-sm font-semibold">Strong match</p>
                    <p>You have React, TypeScript and Testing. Accessibility is the gap.</p>
                  </div>
                </div>

                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {["React", "TypeScript", "Testing"].map((k) => (
                    <li key={k} className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-success-fg">
                      <Check className="size-3.5" /> {k}
                    </li>
                  ))}
                  {["Accessibility", "GraphQL"].map((k) => (
                    <li key={k} className="rounded-md border border-border px-2 py-1 text-muted">
                      {k}
                    </li>
                  ))}
                </ul>

                {beat.step === 2 ? (
                  <div ref={applyRef} className="grid h-10 place-items-center rounded-md bg-primary text-sm font-medium text-white">
                    <span className="inline-flex items-center gap-2">
                      {applied ? <Check className="size-4" /> : pressing ? <Loader2 className="size-4 animate-spin" /> : null}
                      {applied ? "Applied" : pressing ? "Sending" : "Apply with cover note"}
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Your application</p>
                      <StatusBadge status={current} />
                    </div>
                    <ol className="grid grid-cols-3 gap-2">
                      {TRACK.map((s, i) => {
                        const done = i <= trackIndex || (trackIndex === -1 && i <= 2);
                        return (
                          <li key={s} className="grid gap-1.5">
                            <span className="relative h-1.5 overflow-hidden rounded-full bg-border">
                              <motion.span
                                className="absolute inset-0 origin-left rounded-full bg-primary"
                                initial={false}
                                animate={{ scaleX: done ? 1 : 0 }}
                                transition={reduce ? { duration: 0 } : { duration: 0.3, ease }}
                              />
                            </span>
                            <span className={cn("text-[11px]", done ? "text-text" : "text-muted")}>{s === "applied" ? "Applied" : s === "under_review" ? "Under review" : "Shortlisted"}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.span
            className="pointer-events-none absolute left-0 top-0 text-text"
            style={{ x, y }}
            initial={false}
            animate={{ opacity: cursorOn && beat.step < 3 ? 1 : 0 }}
            transition={t.fast}
          >
            <MousePointer2 className="size-5 fill-surface" />
          </motion.span>
        </div>
      </div>

      <figcaption className="mt-3 flex items-start justify-between gap-4 text-sm text-muted">
        <span>Search, see how you match, apply, and watch the status move. This is the product, in miniature.</span>
        {!reduce && played && (
          <button
            type="button"
            onClick={replay}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary transition-colors duration-fast hover:bg-primary-soft md:min-h-9"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Replay
          </button>
        )}
      </figcaption>
    </figure>
  );
}
