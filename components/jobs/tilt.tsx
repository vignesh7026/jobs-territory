"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_DEG = 2.5; // the brief: 2-3 degrees toward the cursor
const LIFT_PX = 2;

/**
 * Tilts its child up to 2.5 degrees toward the mouse and lifts it 2 px, with a soft shadow. Only transform changes
 * (a 150 ms ease-out CSS transition, no spring). Skipped for touch and pen input and for prefers-reduced-motion;
 * the lift and shadow still apply on hover in that case via the class below.
 */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);

  const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !el.current || !motionOk()) return;
    const r = el.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.current.style.transform = `perspective(1200px) rotateX(${(-py * 2 * MAX_DEG).toFixed(2)}deg) rotateY(${(px * 2 * MAX_DEG).toFixed(2)}deg) translateY(-${LIFT_PX}px)`;
  }
  function reset() {
    if (el.current) el.current.style.transform = "";
  }

  return (
    <div
      ref={el}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onBlur={reset}
      className={cn("rounded-lg transition-[transform,box-shadow] duration-fast ease-out will-change-transform hover:shadow-soft motion-reduce:hover:-translate-y-0.5", className)}
    >
      {children}
    </div>
  );
}
