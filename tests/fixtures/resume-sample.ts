// A plain-text resume and a tiny PDF built from it, for tests of the automatic reader.
export const RESUME_TEXT = `Karthik Raman
Frontend Developer
Coimbatore, Tamil Nadu | +91 98430 27719 | karthik.raman@example.com
linkedin.com/in/karthik-raman | github.com/karthikraman

SUMMARY
Frontend developer with 3 years of experience building accessible React interfaces for logistics and fintech products.

SKILLS
React, TypeScript, JavaScript, Node.js, Tailwind CSS, Jest, Git, REST APIs

EXPERIENCE
Frontend Developer | Orchard Cloud
Jun 2023 - Present
- Built the billing dashboard in React and TypeScript
- Cut page load time by 40 percent with code splitting

Web Developer Intern at Brightwell Labs
Jan 2022 - May 2022
- Fixed accessibility bugs across the marketing site

EDUCATION
B.E. Computer Science and Engineering
PSG College of Technology, Coimbatore 2019 - 2023
`;

/** Minimal valid-enough PDF: one uncompressed text stream, one line per Td move. */
export function makePdf(text: string): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const body = ["BT", "/F1 11 Tf", "72 760 Td", ...text.split("\n").map((l) => `0 -14 Td (${esc(l)}) Tj`), "ET"].join("\n");
  const pdf = `%PDF-1.4\n1 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\ntrailer\n<< >>\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
