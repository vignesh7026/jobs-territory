import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readResume } from "@/lib/resume";
import { createClient } from "@/lib/supabase/server";
import { RESUME_MAX_BYTES, safeFileName, validateResumeFile } from "@/lib/validation/profile";

const BUCKET = "resumes";
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** "<uid>/<timestamp>-<name>.pdf" -> "<name>.pdf" */
const displayName = (path: string) => path.split("/").pop()!.replace(/^\d+-/, "");

/** Upload (or replace) the signed-in candidate's resume. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to upload a resume.", 401);

  // Reject obviously oversized bodies before reading them into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > RESUME_MAX_BYTES + 64 * 1024) return fail("The resume must be 2 MB or smaller.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("We could not read that upload. Try again.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a PDF file to upload.", 400);

  const problem = validateResumeFile(file);
  if (problem) return fail(problem, 400);

  // Content, not just the name or declared type: a PDF starts with "%PDF-".
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return fail("That file is not a valid PDF.", 400);

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("resume_path").eq("id", user.id).single();

  const path = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (upload.error) return fail("We could not store your resume. Try again.", 500);

  const { error } = await supabase.from("profiles").update({ resume_path: path }).eq("id", user.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // do not leave an orphan behind
    return fail("We could not save your resume. Try again.", 500);
  }
  if (before?.resume_path) await supabase.storage.from(BUCKET).remove([before.resume_path]);

  // Read the resume so the profile can fill itself in. A resume that cannot be read (a scan, say) is still stored.
  const read = readResume(bytes, file.name);
  return NextResponse.json({
    path,
    name: displayName(path),
    ...(read.ok ? { parsed: read.parsed, personName: read.name } : { readError: read.error }),
  });
}

/** Remove the resume. Applications keep the path they snapshotted, but the file is gone, so they show no download. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("resume_path").eq("id", user.id).single();
  if (data?.resume_path) await supabase.storage.from(BUCKET).remove([data.resume_path]);
  const { error } = await supabase.from("profiles").update({ resume_path: null }).eq("id", user.id);
  if (error) return fail("We could not remove your resume. Try again.", 500);
  return NextResponse.json({ ok: true });
}

/** Short-lived signed link to the signed-in candidate's own resume. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("resume_path").eq("id", user.id).single();
  if (!data?.resume_path) return fail("You have not uploaded a resume.", 404);

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(data.resume_path, 60, { download: displayName(data.resume_path) });
  if (signed.error || !signed.data) return fail("We could not open your resume. Try again.", 500);
  return NextResponse.redirect(signed.data.signedUrl);
}
