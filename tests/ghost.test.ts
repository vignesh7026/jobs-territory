import { describe, expect, it } from "vitest";
import { ghostCheck, listingAgeDays } from "@/lib/ghost";

const now = new Date("2026-06-30T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();
const job = (o: Partial<Parameters<typeof ghostCheck>[0]> = {}) => ({ firstPostedAt: null, postedAt: daysAgo(2), repostCount: 0, isVague: false, ...o });

describe("ghost-job check", () => {
  it("a fresh, specific listing is clean", () => expect(ghostCheck(job(), now)).toEqual({ level: "none", reasons: [] }));
  it("age uses the first posting date, not the latest repost", () => {
    expect(listingAgeDays({ firstPostedAt: daysAgo(70), postedAt: daysAgo(1) }, now)).toBe(70);
    expect(listingAgeDays({ firstPostedAt: null, postedAt: daysAgo(5) }, now)).toBe(5);
  });
  it("one signal asks for a check and names it with the real number", () => {
    const r = ghostCheck(job({ firstPostedAt: daysAgo(58) }), now);
    expect(r.level).toBe("check");
    expect(r.reasons).toEqual(["First posted 58 days ago."]);
  });
  it("a very old, repeatedly reposted listing is flagged as likely stale", () => {
    const r = ghostCheck(job({ firstPostedAt: daysAgo(96), repostCount: 3 }), now);
    expect(r.level).toBe("likely");
    expect(r.reasons[0]).toContain("96 days");
    expect(r.reasons[1]).toContain("3 times");
  });
  it("a vague listing on its own is a check, not an accusation", () => {
    const r = ghostCheck(job({ isVague: true }), now);
    expect(r.level).toBe("check");
    expect(r.reasons[0]).toContain("thin");
  });
  it("vague plus a repost adds up to a check, vague plus very old to likely", () => {
    expect(ghostCheck(job({ isVague: true, repostCount: 1 }), now).level).toBe("check");
    expect(ghostCheck(job({ isVague: true, firstPostedAt: daysAgo(100) }), now).level).toBe("likely");
  });
  it("singular wording for one repost", () => expect(ghostCheck(job({ repostCount: 1 }), now).reasons[0]).toBe("Reposted once."));
  it("a future posting date does not give a negative age", () => expect(listingAgeDays({ firstPostedAt: null, postedAt: daysAgo(-3) }, now)).toBe(0));
});
