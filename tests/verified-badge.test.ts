import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VerifiedBadge } from "@/components/jobs/verified-badge";

describe("VerifiedBadge", () => {
  it("says Verified with the admin's note as the title", () => {
    const html = renderToStaticMarkup(createElement(VerifiedBadge, { verified: true, note: "Registration checked" }));
    expect(html).toContain("Verified");
    expect(html).toContain("Registration checked");
    expect(html).not.toContain("Not verified");
  });
  it("says Not verified in words, never colour alone, and warns about paying", () => {
    const html = renderToStaticMarkup(createElement(VerifiedBadge, { verified: false }));
    expect(html).toContain("Not verified");
    expect(html).toContain("never pay");
  });
});
