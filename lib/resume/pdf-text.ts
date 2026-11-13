// Reads the text of a PDF with Mozilla's pdf.js (through unpdf), which understands the font encodings that Word, Canva
// and Google Docs produce. The result is rebuilt into lines by position: items on the same baseline form one line,
// ordered left to right, with a space wherever there is a visible gap, so "Bengaluru, Karnataka | email | phone" stays
// one readable line and two-column rows ("Languages:" beside its values) read in the right order.
import { getDocumentProxy } from "unpdf";

const SAME_LINE = 2.5; // points: items within this vertical distance of a line's first item belong to that line
const GAP = 1.5; // points: a horizontal gap wider than this needs a space
const MAX_PAGES = 10;

interface Item {
  s: string;
  x: number;
  y: number;
  w: number;
}

/** Group items into lines by vertical position, then order each line left to right and join the pieces. */
export function itemsToLines(items: Item[]): string[] {
  const byY = [...items].sort((a, b) => b.y - a.y);
  const groups: { y: number; items: Item[] }[] = [];
  for (const it of byY) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g.y - it.y) <= SAME_LINE) g.items.push(it);
    else groups.push({ y: it.y, items: [it] });
  }
  return groups.map((g) => {
    g.items.sort((a, b) => a.x - b.x);
    let s = "";
    let end = -Infinity;
    for (const it of g.items) {
      const needSpace = s !== "" && it.x - end > GAP && !s.endsWith(" ") && !it.s.startsWith(" ");
      s += (needSpace ? " " : "") + it.s;
      end = Math.max(end, it.x + it.w);
    }
    return s;
  });
}

/** Lines of text in reading order, pages one after another. Throws if the file is not a readable PDF. */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  // pdf.js takes ownership of the buffer it is given, so hand it a copy and keep the caller's intact.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const out: string[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, MAX_PAGES); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: Item[] = [];
    for (const it of content.items) {
      if (!("str" in it) || it.str.length === 0) continue;
      items.push({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width });
    }
    out.push(...itemsToLines(items), "");
  }
  return out.join("\n");
}
