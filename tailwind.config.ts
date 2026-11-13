import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// All colours resolve to CSS variables defined in app/globals.css (light + dark).
// The function form lets Tailwind opacity modifiers (bg-danger/10) work with hex variables.
// Tailwind's TS types only declare string colours, but its runtime accepts this function form.
const v = (name: string) =>
  (({ opacityValue }: { opacityValue?: string }) =>
    // Without an explicit modifier Tailwind passes undefined or var(--tw-*-opacity): use the plain colour.
    opacityValue === undefined || opacityValue === "1" || opacityValue.startsWith("var(")
      ? `var(--${name})`
      : `color-mix(in srgb, var(--${name}) ${Number(opacityValue) * 100}%, transparent)`) as unknown as string;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        border: v("border"),
        text: v("text"),
        muted: v("muted"),
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), soft: v("primary-soft"), fg: v("primary-fg") },
        accent: v("accent"),
        // DEFAULT = the brief's exact colour (fills, borders, icons). fg = same hue, AA-safe as text.
        success: { DEFAULT: v("success"), fg: v("success-fg") },
        warning: { DEFAULT: v("warning"), fg: v("warning-fg") },
        danger: { DEFAULT: v("danger"), fg: v("danger-fg") },
        info: { DEFAULT: v("info"), fg: v("info-fg") },
        status: {
          applied: { DEFAULT: v("st-applied"), fg: v("st-applied-fg") },
          review: { DEFAULT: v("st-review"), fg: v("st-review-fg") },
          shortlisted: { DEFAULT: v("st-shortlisted"), fg: v("st-shortlisted-fg") },
          interview: { DEFAULT: v("st-interview"), fg: v("st-interview-fg") },
          offered: { DEFAULT: v("st-offered"), fg: v("st-offered-fg") },
          rejected: { DEFAULT: v("st-rejected"), fg: v("st-rejected-fg") },
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      // Scale 12 / 14 / 16 / 20 / 24 / 32 / 44. Body 1.5, headings 1.2.
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.5" }],
        xl: ["20px", { lineHeight: "1.2" }],
        "2xl": ["24px", { lineHeight: "1.2" }],
        "3xl": ["32px", { lineHeight: "1.2" }],
        "4xl": ["44px", { lineHeight: "1.2" }],
      },
      borderRadius: { md: "8px", lg: "12px" },
      boxShadow: { soft: "0 1px 2px rgba(20,32,43,0.06), 0 8px 24px rgba(20,32,43,0.06)" },
      transitionDuration: { fast: "150ms", base: "200ms", slow: "300ms" },
      transitionTimingFunction: { out: "cubic-bezier(0.16, 1, 0.3, 1)" },
      maxWidth: { prose: "70ch" },
    },
  },
  plugins: [animate],
};

export default config;
