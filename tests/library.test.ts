import { describe, expect, it } from "vitest";
import { MAX_COMPARE, bestIndexes, parseCompareIds } from "@/lib/compare";
import { filterCommands, scoreCommand } from "@/lib/palette";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

describe("parseCompareIds", () => {
  it("reads comma-separated ids in order", () => expect(parseCompareIds(`${A},${B}`)).toEqual([A, B]));
  it("reads repeated parameters", () => expect(parseCompareIds([A, B])).toEqual([A, B]));
  it("drops invalid ids and duplicates", () => expect(parseCompareIds(`${A},nope,${A},,'; drop table jobs;--,${B}`)).toEqual([A, B]));
  it("keeps at most three", () => expect(parseCompareIds(`${A},${B},${C},${D}`)).toHaveLength(MAX_COMPARE));
  it("handles nothing at all", () => {
    expect(parseCompareIds(undefined)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
  });
  it("is case-insensitive about hex", () => expect(parseCompareIds(A.toUpperCase())).toEqual([A]));
});

describe("bestIndexes", () => {
  it("finds the highest, and ties", () => {
    expect(bestIndexes([10, 30, 20])).toEqual([1]);
    expect(bestIndexes([30, 30, 20])).toEqual([0, 1]);
  });
  it("finds the lowest when lower is better", () => expect(bestIndexes([5, 3, 9], "low")).toEqual([1]));
  it("ignores missing values", () => expect(bestIndexes([null, 40, 70])).toEqual([2]));
  it("highlights nothing when there is no real difference", () => {
    expect(bestIndexes([50, 50, 50])).toEqual([]);
    expect(bestIndexes([null, 40, null])).toEqual([]);
    expect(bestIndexes([])).toEqual([]);
  });
});

describe("command palette ranking", () => {
  const cmds = [
    { label: "Jobs", keywords: "search browse" },
    { label: "Applications", keywords: "status trail board" },
    { label: "Saved jobs and searches", keywords: "bookmarks" },
    { label: "Profile", keywords: "resume skills account" },
    { label: "Compare jobs" },
    { label: "Toggle dark mode", keywords: "theme" },
  ];
  it("ranks exact, then prefix, then word-prefix, then contains", () => {
    expect(scoreCommand("jobs", { label: "Jobs" })).toBeGreaterThan(scoreCommand("jobs", { label: "Jobs board" }));
    expect(scoreCommand("jobs", { label: "Jobs board" })).toBeGreaterThan(scoreCommand("jobs", { label: "Saved jobs" }));
    expect(scoreCommand("ob", { label: "Saved jobs" })).toBeGreaterThan(0);
  });
  it("matches keywords the label does not contain", () => expect(filterCommands(cmds, "resume").map((c) => c.label)).toEqual(["Profile"]));
  it("shows everything for an empty query, in the original order", () => expect(filterCommands(cmds, "").map((c) => c.label)).toEqual(cmds.map((c) => c.label)));
  it("puts the best match first", () => expect(filterCommands(cmds, "app")[0].label).toBe("Applications"));
  it("returns nothing for gibberish", () => expect(filterCommands(cmds, "zzzqq")).toEqual([]));
  it("tolerates a loose, in-order abbreviation", () => expect(filterCommands(cmds, "tgl dk").map((c) => c.label)).toEqual(["Toggle dark mode"]));
  it("does not match a single stray letter loosely", () => expect(scoreCommand("q", { label: "Applications" })).toBe(0));
});
