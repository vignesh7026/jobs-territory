/**
 * A small, restrained burst for the apply confirmation. Brand colours only (primary and accent), about 24 pieces,
 * about a second. Uses the Web Animations API on transform and opacity only. Does nothing under prefers-reduced-motion.
 */
export function burst(origin: { x: number; y: number }, count = 24): void {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const css = getComputedStyle(document.documentElement);
  const colors = [css.getPropertyValue("--primary").trim() || "#0E6B63", css.getPropertyValue("--accent").trim() || "#C2410C"];

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", overflow: "hidden", zIndex: "80" });

  const animations: Animation[] = [];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const wide = Math.random() > 0.5;
    Object.assign(piece.style, {
      position: "absolute",
      left: `${origin.x}px`,
      top: `${origin.y}px`,
      width: wide ? "10px" : "6px",
      height: wide ? "6px" : "10px",
      borderRadius: "1px",
      background: colors[i % colors.length],
      willChange: "transform, opacity",
    });
    layer.appendChild(piece);

    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 70 + Math.random() * 110;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 50; // a little upward bias, then gravity
    const spin = (Math.random() - 0.5) * 540;
    animations.push(
      piece.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx * 1.1}px, ${dy + 130}px) rotate(${spin}deg)`, opacity: 0 },
        ],
        { duration: 850 + Math.random() * 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      ),
    );
  }

  document.body.appendChild(layer);
  Promise.allSettled(animations.map((a) => a.finished)).then(() => layer.remove());
}
