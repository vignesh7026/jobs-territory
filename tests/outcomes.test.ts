import { describe, expect, it } from "vitest";
import { computeOutcomes, median, type OutcomeInput } from "@/lib/outcomes";

const now = new Date("2026-06-30T00:00:00Z");
const day = (n: number) => new Date(Date.parse("2026-06-01T00:00:00Z") + n * 864e5).toISOString();
const app = (o: Partial<OutcomeInput> = {}): OutcomeInput => ({ status: "applied", createdAt: day(0), firstResponseAt: null, autoApplied: false, ...o });

describe("median", () => {
  it("handles odd, even and empty", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(3); // 2.5 rounds to 3
    expect(median([])).toBeNull();
  });
});

describe("computeOutcomes", () => {
  it("returns nothing for fewer than three applications", () => {
    expect(computeOutcomes([app(), app()], now)).toBeNull();
  });

  it("counts responses, rate, interviews and offers from the candidate's own data", () => {
    const o = computeOutcomes(
      [app({ status: "under_review", firstResponseAt: day(2) }), app({ status: "interview", firstResponseAt: day(4) }), app({ status: "offered", firstResponseAt: day(6) }), app()],
      now,
    )!;
    expect(o.total).toBe(4);
    expect(o.responded).toBe(3);
    expect(o.rate).toBe(75);
    expect(o.interviews).toBe(2); // interview and offered both got to an interview
    expect(o.offers).toBe(1);
    expect(o.medianDays).toBe(4);
    expect(o.smallSample).toBe(true);
  });

  it("a rejection is a response", () => {
    const o = computeOutcomes([app({ status: "rejected", firstResponseAt: day(3) }), app(), app()], now)!;
    expect(o.responded).toBe(1);
  });

  it("no median with fewer than two responses", () => {
    expect(computeOutcomes([app({ status: "under_review", firstResponseAt: day(2) }), app(), app()], now)!.medianDays).toBeNull();
  });

  it("flags waiting applications older than twice the median, or 14 days without one", () => {
    const o = computeOutcomes([app({ status: "under_review", firstResponseAt: day(2) }), app({ status: "under_review", firstResponseAt: day(4) }), app(), app({ createdAt: day(26) })], now)!;
    expect(o.medianDays).toBe(3);
    expect(o.waiting).toBe(2);
    expect(o.slow).toBe(1); // the one from day 0 has waited 29 days; the one from day 26 only 4 (limit 6)
    const none = computeOutcomes([app(), app(), app({ createdAt: day(28) })], now)!;
    expect(none.slow).toBe(2); // 29 days > 14; day 28 is 2 days
  });

  it("compares automatic and manual only when both groups have three or more", () => {
    const manual = [app(), app(), app({ status: "under_review", firstResponseAt: day(1) })];
    const auto = [app({ autoApplied: true }), app({ autoApplied: true }), app({ autoApplied: true })];
    const o = computeOutcomes([...manual, ...auto], now)!;
    expect(o.autoVsManual).not.toBeNull();
    expect(o.autoVsManual![0]).toMatchObject({ label: "Applied by hand", total: 3, responded: 1, rate: 33 });
    expect(o.autoVsManual![1]).toMatchObject({ total: 3, responded: 0, rate: 0 });
    expect(computeOutcomes([...manual, auto[0]], now)!.autoVsManual).toBeNull();
  });
});
