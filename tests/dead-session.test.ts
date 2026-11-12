import { describe, expect, it } from "vitest";
import { isDeadSession } from "@/lib/supabase/proxy";

describe("isDeadSession", () => {
  it("is true when the auth server says the session or user is gone", () => {
    expect(isDeadSession({ name: "AuthApiError", status: 403 })).toBe(true);
    expect(isDeadSession({ name: "AuthApiError", status: 401 })).toBe(true);
    expect(isDeadSession({ name: "AuthSessionMissingError" })).toBe(true);
  });
  it("is false for network trouble or a server error, so cookies are kept", () => {
    expect(isDeadSession({ name: "AuthRetryableFetchError", status: 0 })).toBe(false);
    expect(isDeadSession({ name: "AuthRetryableFetchError" })).toBe(false);
    expect(isDeadSession({ name: "AuthApiError", status: 500 })).toBe(false);
    expect(isDeadSession({ name: "AuthApiError", status: 503 })).toBe(false);
  });
});
