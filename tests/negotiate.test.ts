import { describe, expect, it } from "vitest";
import { describeRange, formatInr, marketRange, midpointInr, plainNegotiation } from "@/lib/negotiate";

describe("market range", () => {
  it("needs at least three comparable listings", () => {
    expect(marketRange([1_000_000, 1_200_000])).toBeNull();
    expect(marketRange([])).toBeNull();
  });
  it("returns 25th, 50th and 75th percentiles of the midpoints", () => {
    const r = marketRange([1_000_000, 1_400_000, 1_200_000, 1_600_000, 1_800_000])!;
    expect(r).toEqual({ low: 1_200_000, mid: 1_400_000, high: 1_600_000, sample: 5 });
  });
  it("ignores junk values", () => expect(marketRange([NaN, 0, -5, 1, 2, 3])?.sample).toBe(3));
  it("midpoint converts using the stored INR max and the original ratio", () => {
    expect(midpointInr(100, 200, 16_600)).toBeCloseTo(12_450); // 100-200 at 83 INR: max 16,600, mid 150 -> 12,450
    expect(midpointInr(null, 200, 16_600)).toBeCloseTo(16_600);
    expect(midpointInr(100, null, null)).toBeNull();
  });
});

describe("formatting", () => {
  it("annual in LPA, monthly as a stipend", () => {
    expect(formatInr(1_420_000, false)).toBe("₹14.2 LPA");
    expect(formatInr(270_000, true)).toBe("₹22,500 / month");
  });
  it("describes the range in words", () => expect(describeRange({ low: 1_200_000, mid: 1_400_000, high: 1_600_000, sample: 5 }, false)).toBe("₹12 LPA to ₹16 LPA, middle ₹14 LPA"));
});

describe("plain negotiation draft", () => {
  const base = { firstName: "Meera", jobTitle: "Backend Engineer, Lending", company: "Indus Ledger", offer: "", range: null as string | null };
  it("never invents a figure", () => {
    const d = plainNegotiation(base);
    expect(d.body).not.toMatch(/\d/);
    expect(d.body).toContain("flexibility on the compensation");
  });
  it("quotes the candidate's own offer and the market range when given", () => {
    const d = plainNegotiation({ ...base, offer: "21 LPA", range: "₹20 LPA to ₹26 LPA, middle ₹23 LPA" });
    expect(d.body).toContain("The offer of 21 LPA is appreciated.");
    expect(d.body).toContain("₹20 LPA to ₹26 LPA");
    expect(d.body.endsWith("Meera")).toBe(true);
  });
});
