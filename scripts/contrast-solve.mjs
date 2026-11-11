// For each text token: the smallest nudge toward black (light) / white (dark) that gives >= 4.6:1 (a little margin
// over 4.5) on both the card and the page, as plain text and on its own 10% tint.   node scripts/contrast-solve.mjs
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));

const tokens = { applied: "#5F6B7A", review: "#B7791F", shortlisted: "#0E6B63", interview: "#2F5D8A", offered: "#2F7D4F", rejected: "#B42318", success: "#2F7D4F", warning: "#B7791F", danger: "#B42318", info: "#2F5D8A" };
const themes = { light: { bg: hex("#F7F6F2"), surface: hex("#FFFFFF"), toward: [0, 0, 0] }, dark: { bg: hex("#0F1417"), surface: hex("#171E23"), toward: [255, 255, 255] } };
const TARGET = 4.6;

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [k, h] of Object.entries(tokens)) {
    const base = hex(h);
    let found = null;
    for (let p = 100; p >= 0; p--) {
      const fg = mix(base, t.toward, p / 100);
      const ok = [t.surface, t.bg].every((g) => ratio(fg, g) >= TARGET && ratio(fg, mix(base, g, 0.1)) >= TARGET);
      if (ok) { found = p; break; }
    }
    console.log(`  ${k.padEnd(12)} keep ${String(found).padStart(3)}% of the colour`);
  }
}
