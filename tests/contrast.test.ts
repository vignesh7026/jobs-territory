// Reads the real design tokens from app/globals.css and checks WCAG AA (4.5:1 for text) in BOTH themes.
// If someone changes a colour and breaks accessibility, this fails.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type RGB = [number, number, number];
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = block(":root");
const dark = { ...light, ...block(".dark") };

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v * t + b[i] * (1 - t))) as RGB; // t of a, the rest of b

/** Resolves #hex, var(--x) and color-mix(in srgb, <c> N%, <c>) the way the browser would. */
function resolve(value: string, vars: Record<string, string>): RGB {
  const v = value.trim();
  if (v.startsWith("#")) return hex(v);
  if (v === "white") return [255, 255, 255];
  if (v === "black") return [0, 0, 0];
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return resolve(vars[ref[1]], vars);
  const m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/);
  if (m) return mix(resolve(m[1], vars), resolve(m[3], vars), Number(m[2]) / 100);
  throw new Error(`Cannot resolve colour: ${value}`);
}

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const STATUS = ["applied", "review", "shortlisted", "interview", "offered", "rejected"];
const SEMANTIC = ["success", "warning", "danger", "info"];

for (const [theme, vars] of [["light", light], ["dark", dark]] as const) {
  const c = (name: string) => resolve(vars[name], vars);
  const surface = c("surface");
  const bg = c("bg");

  describe(`WCAG AA text contrast: ${theme} theme`, () => {
    it.each([
      ["text on bg", "text", bg],
      ["text on surface", "text", surface],
      ["muted text on bg", "muted", bg],
      ["muted text on surface", "muted", surface],
      ["primary (links, active nav) on bg", "primary", bg],
      ["primary on surface", "primary", surface],
      ["accent on bg", "accent", bg],
    ] as const)("%s", (_label, fg, on) => {
      expect(ratio(c(fg), on)).toBeGreaterThanOrEqual(4.5);
    });

    it("text on primary soft background (badges, chips)", () => {
      expect(ratio(c("primary"), c("primary-soft"))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c("text"), c("primary-soft"))).toBeGreaterThanOrEqual(4.5);
    });

    it("button label on the primary button, and on hover", () => {
      expect(ratio(c("primary-fg"), c("primary"))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c("primary-fg"), c("primary-hover"))).toBeGreaterThanOrEqual(4.5);
    });

    it.each(STATUS)("status %s: text on its 10%% tint, on the page and on a card", (k) => {
      const fg = c(`st-${k}-fg`);
      const base = c(`st-${k}`);
      for (const ground of [surface, bg]) expect(ratio(fg, mix(base, ground, 0.1))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(SEMANTIC)("%s: text on its 10%% tint, on the page and on a card", (k) => {
      const fg = c(`${k}-fg`);
      const base = c(k);
      for (const ground of [surface, bg]) expect(ratio(fg, mix(base, ground, 0.1))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the brief's exact colours for fills and borders (the -fg variants only affect text)", () => {
      const brief: Record<string, string> =
        theme === "light"
          ? { bg: "#f7f6f2", surface: "#ffffff", border: "#e4e1da", text: "#1b2430", muted: "#5f6b7a", primary: "#0e6b63", "primary-hover": "#0a5650", "primary-soft": "#e3f1ee", accent: "#c2410c" }
          : { bg: "#0f1417", surface: "#171e23", border: "#27313a", text: "#e8ecef", muted: "#9aa7b2", primary: "#3fb5a6", "primary-hover": "#5cc8ba", "primary-soft": "#12302d", accent: "#f08a5d" };
      for (const [k, v] of Object.entries(brief)) expect(vars[k].toLowerCase()).toBe(v);
      expect(light["st-review"].toLowerCase()).toBe("#b7791f");
      expect(light["st-rejected"].toLowerCase()).toBe("#b42318");
    });
  });
}
