// Measures WCAG contrast for the brief's colour tokens as they are actually used.   node scripts/contrast-report.mjs
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t))); // t of a, rest of b

const themes = {
  light: { bg: "#F7F6F2", surface: "#FFFFFF", text: "#1B2430", muted: "#5F6B7A", primary: "#0E6B63", accent: "#C2410C", success: "#2F7D4F", warning: "#B7791F", danger: "#B42318", info: "#2F5D8A",
    applied: "#5F6B7A", review: "#B7791F", shortlisted: "#0E6B63", interview: "#2F5D8A", offered: "#2F7D4F", rejected: "#B42318", toward: [0, 0, 0] },
  dark: { bg: "#0F1417", surface: "#171E23", text: "#E8ECEF", muted: "#9AA7B2", primary: "#3FB5A6", accent: "#F08A5D", success: "#2F7D4F", warning: "#B7791F", danger: "#B42318", info: "#2F5D8A",
    applied: "#5F6B7A", review: "#B7791F", shortlisted: "#0E6B63", interview: "#2F5D8A", offered: "#2F7D4F", rejected: "#B42318", toward: [255, 255, 255] },
};

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n== ${name} ==`);
  const surface = hex(t.surface), bg = hex(t.bg);
  const row = (label, fg, on, need = 4.5) => { const r = ratio(fg, on); console.log(`${r >= need ? "ok  " : "FAIL"} ${label.padEnd(34)} ${r.toFixed(2)}:1 (needs ${need})`); };
  row("text on bg", hex(t.text), bg); row("text on surface", hex(t.text), surface);
  row("muted on bg", hex(t.muted), bg); row("muted on surface", hex(t.muted), surface);
  row("primary on bg (links)", hex(t.primary), bg); row("accent on bg", hex(t.accent), bg);
  for (const k of ["applied", "review", "shortlisted", "interview", "offered", "rejected"]) {
    const base = hex(t[k]), tint = mix(base, surface, 0.1);
    row(`status ${k} text on its tint`, base, tint);
    // smallest shift toward black/white that reaches 4.5
    for (let p = 100; p >= 0; p -= 2) { const fg = mix(base, t.toward, p / 100); if (ratio(fg, mix(fg, surface, 0.1)) >= 4.5 || ratio(fg, tint) >= 4.5) { console.log(`     -> keep ${p}% of the colour, rest toward ${t.toward[0] ? "white" : "black"}: ${ratio(fg, tint).toFixed(2)}:1`); break; } }
  }
  for (const k of ["success", "warning", "danger", "info"]) row(`${k} text on 10% tint`, hex(t[k]), mix(hex(t[k]), surface, 0.1));
}
