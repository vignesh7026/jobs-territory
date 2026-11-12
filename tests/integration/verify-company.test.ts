// Company verification: only admins can change it, and verifying needs a note. Real database, real RLS.
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const fresh = () => createClient<Database>(url, anon, { auth: { persistSession: false } });

describe("admin_set_company_verified", () => {
  it("is refused for a candidate and for the table directly", async () => {
    const c = fresh();
    await c.auth.signUp({ email: `verify-${Date.now()}@example.com`, password: "test-pass-1234" });
    const { data: co } = await c.from("companies").select("id").eq("slug", "halcyon-design").single();
    const viaFn = await c.rpc("admin_set_company_verified", { p_company: co!.id, p_verified: true, p_note: "I checked it myself" });
    expect(viaFn.error?.code).toBe("42501");
    const direct = await c.from("companies").update({ verified: true }).eq("id", co!.id);
    expect(direct.error).not.toBeNull();
    const { data: after } = await c.from("companies").select("verified").eq("id", co!.id).single();
    expect(after!.verified).toBe(false);
  });

  it("lets an admin verify with a note, requires the note, and can undo", async () => {
    const a = fresh();
    const { error } = await a.auth.signInWithPassword({ email: "admin@jobsterritory.example", password: "Demo-Admin-26" });
    expect(error).toBeNull();
    const { data: co } = await a.from("companies").select("id").eq("slug", "halcyon-design").single();

    const noNote = await a.rpc("admin_set_company_verified", { p_company: co!.id, p_verified: true });
    expect(noNote.error?.code).toBe("22023");

    const ok = await a.rpc("admin_set_company_verified", { p_company: co!.id, p_verified: true, p_note: "Registration and domain checked" });
    expect(ok.error).toBeNull();
    expect(ok.data?.verified).toBe(true);
    expect(ok.data?.verification_note).toBe("Registration and domain checked");

    const undone = await a.rpc("admin_set_company_verified", { p_company: co!.id, p_verified: false });
    expect(undone.data?.verified).toBe(false);
    expect(undone.data?.verification_note).toBeNull();
  });
});
