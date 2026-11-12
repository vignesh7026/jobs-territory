import { describe, expect, it } from "vitest";
import { buildIcs, fold, icsDate, icsEscape } from "@/lib/ics";

describe("ics", () => {
  const start = new Date("2026-07-03T09:30:00Z");
  const now = new Date("2026-06-01T00:00:00Z");

  it("formats UTC dates", () => expect(icsDate(start)).toBe("20260703T093000Z"));

  it("escapes text values", () => expect(icsEscape("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne"));

  it("builds a valid event with CRLF endings, an end an hour later, and two reminders", () => {
    const out = buildIcs({ uid: "abc", title: "Interview: Frontend Engineer at Acme", start, now });
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("DTSTART:20260703T093000Z\r\n");
    expect(out).toContain("DTEND:20260703T103000Z\r\n");
    expect(out).toContain("DTSTAMP:20260601T000000Z\r\n");
    expect(out).toContain("SUMMARY:Interview: Frontend Engineer at Acme\r\n");
    expect(out.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(out.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("folds long lines at 75 bytes without splitting characters", () => {
    const long = "SUMMARY:" + "é".repeat(80);
    const folded = fold(long);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });

  it("leaves short lines alone and omits empty optional fields", () => {
    expect(fold("SHORT")).toBe("SHORT");
    const out = buildIcs({ uid: "x", title: "T", start, now });
    expect(out).not.toContain("DESCRIPTION:Interview details");
    expect(out).not.toContain("LOCATION:");
  });
});
