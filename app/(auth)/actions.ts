"use server";

import { redirect } from "next/navigation";
import { AFTER_LOGIN, safeNext } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation/auth";

const UNREACHABLE = "We could not reach the sign-in service. Check that the database is running (npm run db:start), then try again.";
/** supabase-js returns network failures as errors with no HTTP status, not as exceptions. */
const unreachable = (e: { status?: number; name?: string }) => e.name === "AuthRetryableFetchError" || e.status === 0 || e.status === undefined;

export interface AuthFormState {
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so the form keeps what the person typed (never the password). */
  values?: { fullName?: string; email?: string };
}

export async function login(_prev: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email: raw.email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (unreachable(error)) return { message: UNREACHABLE, values: { email: raw.email } };
    const message =
      error.status === 429
        ? "Too many attempts. Wait a minute and try again."
        : error.code === "email_not_confirmed"
          ? "Confirm your email address first. We sent you a link when you signed up."
          : "Incorrect email or password."; // same message for unknown email and wrong password
    return { message, values: { email: raw.email } };
  }
  redirect(safeNext(String(formData.get("next") ?? ""), AFTER_LOGIN));
}

export async function register(_prev: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { fullName: raw.fullName, email: raw.email };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    if (unreachable(error)) return { message: UNREACHABLE, values };
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { fieldErrors: { email: "An account with this email already exists. Sign in instead." }, values };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: error.message }, values };
    if (error.status === 429) return { message: "Too many attempts. Wait a minute and try again.", values };
    return { message: "We could not create your account. Please try again.", values };
  }

  // With email confirmation switched on there is no session yet.
  if (!data.session) return { message: "Check your inbox. We sent a link to confirm your email address.", values };
  redirect("/profile");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
