import { describe, expect, it } from "vitest";
import { activeChips, defaultSort, filtersHref, hasActiveFilters, parseFilters, toSearchParams, withFilters } from "@/lib/jobs/filters";
import { daysUntil, formatSalary, timeAgo } from "@/lib/format";

describe("parseFilters", () => {
  it("returns clean defaults for an empty URL", () => {
    expect(parseFilters({})).toEqual({ q: "", location: "", types: [], modes: [], levels: [], sort: "newest", page: 1 });
  });

  it("reads comma-separated and repeated values, keeps canonical order and drops unknown ones", () => {
    const f = parseFilters({ type: "internship,full_time,nonsense", mode: ["remote", "onsite"], level: "senior,senior" });
    expect(f.types).toEqual(["full_time", "internship"]);
    expect(f.modes).toEqual(["onsite", "remote"]);
    expect(f.levels).toEqual(["senior"]);
  });

  it("normalises whitespace and caps keyword and location length", () => {
    const f = parseFilters({ q: "   react    developer  ", location: "x".repeat(200) });
    expect(f.q).toBe("react developer");
    expect(f.location).toHaveLength(80);
  });

  it("defaults to relevance when searching and newest otherwise; ignores relevance without a keyword", () => {
    expect(parseFilters({ q: "react" }).sort).toBe("relevance");
    expect(parseFilters({}).sort).toBe("newest");
    expect(parseFilters({ sort: "relevance" }).sort).toBe("newest");
    expect(parseFilters({ sort: "salary" }).sort).toBe("salary");
    expect(parseFilters({ sort: "drop table" }).sort).toBe("newest");
  });

  it("clamps bad page numbers", () => {
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(parseFilters({ page: "-4" }).page).toBe(1);
    expect(parseFilters({ page: "abc" }).page).toBe(1);
    expect(parseFilters({ page: "99999" }).page).toBe(500);
    expect(parseFilters({ page: "3" }).page).toBe(3);
  });

  it("works with URLSearchParams too", () => {
    const f = parseFilters(new URLSearchParams("q=figma&type=contract&type=internship"));
    expect(f.q).toBe("figma");
    expect(f.types).toEqual(["contract", "internship"]);
  });
});

describe("toSearchParams / filtersHref", () => {
  it("omits defaults so equal searches share one URL", () => {
    expect(filtersHref(parseFilters({}))).toBe("/jobs");
    expect(filtersHref(parseFilters({ q: "react", sort: "relevance" }))).toBe("/jobs?q=react");
    expect(filtersHref(parseFilters({ sort: "newest", page: "1" }))).toBe("/jobs");
  });

  it("round-trips every field", () => {
    const raw = { q: "data analyst", location: "Bengaluru", type: "full_time,internship", mode: "hybrid", level: "junior,mid", sort: "salary", page: "3" };
    const f = parseFilters(raw);
    expect(parseFilters(toSearchParams(f))).toEqual(f);
    expect(filtersHref(f)).toBe("/jobs?q=data+analyst&location=Bengaluru&type=full_time%2Cinternship&mode=hybrid&level=junior%2Cmid&sort=salary&page=3");
  });
});

describe("withFilters", () => {
  const base = parseFilters({ q: "react", page: "4" });

  it("goes back to page 1 when a filter changes", () => {
    expect(withFilters(base, { modes: ["remote"] }).page).toBe(1);
  });
  it("keeps the page when the change is a page change", () => {
    expect(withFilters(base, { page: 5 }).page).toBe(5);
  });
  it("moves to newest when the keyword is cleared while sorted by relevance", () => {
    expect(withFilters(base, { q: "" }).sort).toBe("newest");
  });
  it("switches to relevance when a keyword is added while on the default sort", () => {
    expect(withFilters(parseFilters({}), { q: "figma" }).sort).toBe("relevance");
  });
  it("keeps a deliberately chosen sort", () => {
    expect(withFilters(parseFilters({ sort: "salary" }), { q: "figma" }).sort).toBe("salary");
  });
  it("default sort rule", () => {
    expect(defaultSort("x")).toBe("relevance");
    expect(defaultSort("")).toBe("newest");
  });
});

describe("activeChips", () => {
  it("lists each active filter and what the search looks like without it", () => {
    const f = parseFilters({ q: "react", location: "Pune", type: "full_time,contract", mode: "remote" });
    const chips = activeChips(f);
    expect(chips.map((c) => c.label)).toEqual(['"react"', "Pune", "Full-time", "Contract", "Remote"]);
    const fullTime = chips.find((c) => c.id === "type:full_time")!;
    expect(fullTime.without.types).toEqual(["contract"]);
    expect(chips.find((c) => c.id === "q")!.without.q).toBe("");
    expect(hasActiveFilters(f)).toBe(true);
    expect(hasActiveFilters(parseFilters({ sort: "salary" }))).toBe(false);
  });
});

describe("formatSalary", () => {
  it("shows Indian full-time pay in lakhs per annum", () => expect(formatSalary(1_420_000, 2_080_000, "INR", "full_time")).toBe("₹14.2–20.8 LPA"));
  it("shows Indian internships as a monthly stipend", () => expect(formatSalary(216_000, 324_000, "INR", "internship")).toBe("₹18,000–27,000 / month"));
  it("shows other currencies in thousands", () => {
    expect(formatSalary(178_000, 224_000, "USD")).toBe("$178k–$224k");
    expect(formatSalary(58_000, 74_000, "GBP")).toBe("£58k–£74k");
    expect(formatSalary(78_000, 104_000, "SGD")).toBe("S$78k–S$104k");
  });
  it("says so when there is no salary", () => expect(formatSalary(null, null, "INR")).toBe("Salary not listed"));
});

describe("timeAgo / daysUntil", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 36e5).toISOString();
  it("reads naturally", () => {
    expect(timeAgo(ago(0.2), now)).toBe("Just now");
    expect(timeAgo(ago(5), now)).toBe("5 hours ago");
    expect(timeAgo(ago(30), now)).toBe("Yesterday");
    expect(timeAgo(ago(24 * 6), now)).toBe("6 days ago");
    expect(timeAgo(ago(24 * 21), now)).toBe("3 weeks ago");
    expect(timeAgo(ago(24 * 95), now)).toBe("3 months ago");
  });
  it("counts days to a deadline and ignores passed ones", () => {
    expect(daysUntil("2026-11-14T12:00:00Z", now)).toBe(3);
    expect(daysUntil("2026-11-10T12:00:00Z", now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });
});

import { pageWindow } from "@/lib/pagination";

describe("pageWindow", () => {
  it("shows everything for a few pages", () => expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]));
  it("collapses distant pages into gaps", () => expect(pageWindow(6, 20)).toEqual([1, "gap", 5, 6, 7, "gap", 20]));
  it("has no gap next to the ends", () => expect(pageWindow(2, 20)).toEqual([1, 2, 3, "gap", 20]));
  it("handles a single page", () => expect(pageWindow(1, 1)).toEqual([1]));
});
