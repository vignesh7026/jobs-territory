// A minimal iCalendar (.ics) event, so an interview can go into any calendar app. Pure and tested.
// Rules followed: CRLF line endings, UTC times, text escaped, lines folded at 75 bytes (RFC 5545).

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  /** minutes; defaults to an hour */
  minutes?: number;
  description?: string;
  location?: string;
  /** when the file was made, injectable for tests */
  now?: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Backslash, semicolon, comma and newlines must be escaped in text values. */
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold a long line: continuation lines start with one space. Counts bytes, never splits a multi-byte character. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // the leading space counts on continuation lines
    if (bytes + b > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  if (cur) parts.push(cur);
  return parts.join("\r\n ");
}

export function buildIcs(e: IcsEvent): string {
  const end = new Date(e.start.getTime() + (e.minutes ?? 60) * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jobs Territory//Candidate Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@jobsterritory.example`,
    `DTSTAMP:${icsDate(e.now ?? new Date())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    // a reminder an hour and a day before
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Interview in 1 hour", "TRIGGER:-PT1H", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Interview tomorrow", "TRIGGER:-P1D", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
