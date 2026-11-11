// Integration tests for resume storage rules. Needs the local Supabase stack:  npm run db:start && npm run test:integration
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const pdf = (extra = 0) => new Blob([new TextEncoder().encode("%PDF-1.4\n" + "x".repeat(extra))], { type: "application/pdf" });

async function newUser(label: string): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: "test-pass-1234" });
  if (error || !data.user || !data.session) throw new Error(`signUp failed: ${error?.message ?? "no session (is email confirmation on?)"}`);
  return { client, id: data.user.id };
}

describe("resume storage rules", () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };
  beforeAll(async () => {
    a = await newUser("storage-a");
    b = await newUser("storage-b");
  });

  it("lets a candidate upload a PDF into their own folder and read it back", async () => {
    const path = `${a.id}/cv.pdf`;
    expect((await a.client.storage.from("resumes").upload(path, pdf(), { contentType: "application/pdf" })).error).toBeNull();
    const got = await a.client.storage.from("resumes").download(path);
    expect(got.error).toBeNull();
    expect(got.data?.size).toBeGreaterThan(0);
  });

  it("blocks uploading into someone else's folder", async () => {
    const { error } = await b.client.storage.from("resumes").upload(`${a.id}/planted.pdf`, pdf(), { contentType: "application/pdf" });
    expect(error).not.toBeNull();
  });

  it("blocks reading someone else's resume", async () => {
    const { data, error } = await b.client.storage.from("resumes").download(`${a.id}/cv.pdf`);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("blocks signed URLs for someone else's resume", async () => {
    const { data, error } = await b.client.storage.from("resumes").createSignedUrl(`${a.id}/cv.pdf`, 60);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("rejects non-PDF content types", async () => {
    const { error } = await a.client.storage.from("resumes").upload(`${a.id}/notes.txt`, new Blob(["hello"], { type: "text/plain" }), { contentType: "text/plain" });
    expect(error).not.toBeNull();
  });

  it("rejects files over 2 MB", async () => {
    const { error } = await a.client.storage.from("resumes").upload(`${a.id}/huge.pdf`, pdf(2 * 1024 * 1024 + 10), { contentType: "application/pdf" });
    expect(error).not.toBeNull();
  });

  it("does not let anonymous visitors list or read the bucket", async () => {
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const listed = await anonClient.storage.from("resumes").list(a.id);
    expect(listed.data ?? []).toHaveLength(0);
    expect((await anonClient.storage.from("resumes").download(`${a.id}/cv.pdf`)).data).toBeNull();
  });
});
