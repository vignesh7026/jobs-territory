import { describe, expect, it } from "vitest";
import { estimateLevel, nextLevel, parsePeriod, timelineNodes } from "@/lib/career";

const now = new Date("2026-06-15T00:00:00Z");
const role = (title: string, period: string) => ({ title, company: "Acme Works", period, description: "" });

describe("parsePeriod", () => {
  it("reads month-year ranges", () => {
    const p = parsePeriod("Jan 2023 - Jun 2023", now)!;
    expect(p.start).toBeCloseTo(2023, 1);
    expect(p.end).toBeCloseTo(2023.4, 1);
    expect(p.current).toBe(false);
  });
  it("treats Present as now", () => {
    const p = parsePeriod("Jul 2023 - Present", now)!;
    expect(p.current).toBe(true);
    expect(p.end).toBeCloseTo(2026.4, 1);
  });
  it("reads plain year ranges and a single year", () => {
    expect(parsePeriod("2021-2023", now)).toMatchObject({ start: 2021, end: 2023 });
    expect(parsePeriod("2022", now)).toMatchObject({ start: 2022, end: 2023 });
  });
  it("returns null when there is no year", () => expect(parsePeriod("a while", now)).toBeNull());
});

describe("estimateLevel", () => {
  it("uses title wording first", () => {
    expect(estimateLevel([role("Senior Developer", "2020 - Present")], now)).toBe("senior");
    expect(estimateLevel([role("Software Engineer Intern", "Jan 2026 - Present")], now)).toBe("intern");
    expect(estimateLevel([role("Engineering Manager", "2019 - Present")], now)).toBe("lead");
  });
  it("falls back to years of work", () => {
    expect(estimateLevel([role("Software Engineer", "Jul 2023 - Present"), role("Software Engineer Intern", "Jan 2023 - Jun 2023")], now)).toBe("mid");
    expect(estimateLevel([role("Developer", "Jan 2026 - Present")], now)).toBe("intern");
    expect(estimateLevel([], now)).toBe("intern");
  });
});

describe("nextLevel", () => {
  it("climbs one step and stops at lead", () => {
    expect(nextLevel("junior")).toBe("mid");
    expect(nextLevel("lead")).toBeNull();
  });
});

describe("timelineNodes", () => {
  it("orders education and roles by date and ends with you-are-here", () => {
    const nodes = timelineNodes(
      {
        level: "mid",
        education: [{ school: "PSG College of Technology", degree: "B.E. Computer Science", year: "2023" }],
        experience: [role("Software Engineer", "Jul 2023 - Present"), role("Software Engineer Intern", "Jan 2023 - Jun 2023")],
      },
      now,
    );
    expect(nodes.map((n) => n.title)).toEqual(["B.E. Computer Science", "Software Engineer Intern", "Software Engineer", "You are here"]);
    expect(nodes[2].when).toBe("Jul 2023 to now");
  });
});
