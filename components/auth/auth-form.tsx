"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { login, register, type AuthFormState } from "@/app/(auth)/actions";
import { emailField, nameField, passwordField } from "@/lib/validation/auth";
import type { ZodType } from "zod";

type Mode = "login" | "register";

const validators: Record<string, ZodType> = { fullName: nameField, email: emailField, password: passwordField };

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState | undefined, FormData>(mode === "login" ? login : register, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [blurErrors, setBlurErrors] = useState<Record<string, string>>({});

  // Validate a field when the person leaves it. The server action repeats the same checks on submit.
  function onBlur(name: string, value: string) {
    // At sign-in we only check that the field is not empty; password rules apply when choosing a password.
    const schema = mode === "login" && name === "password" ? null : validators[name];
    const result = schema ? schema.safeParse(value) : value ? { success: true as const } : { success: false as const, error: { issues: [{ message: "Enter your password" }] } };
    setBlurErrors((e) => {
      const next = { ...e };
      if (result.success) delete next[name];
      else next[name] = result.error.issues[0].message;
      return next;
    });
  }
  const err = (name: string) => blurErrors[name] ?? state?.fieldErrors?.[name];

  return (
    <form action={action} noValidate className="grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.message && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-fg" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}

      {mode === "register" && (
        <FormField id="fullName" label="Full name" error={err("fullName")}>
          {(c) => <Input {...c} name="fullName" autoComplete="name" defaultValue={state?.values?.fullName} onBlur={(e) => onBlur("fullName", e.target.value)} />}
        </FormField>
      )}

      <FormField id="email" label="Email address" error={err("email")}>
        {(c) => <Input {...c} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} onBlur={(e) => onBlur("email", e.target.value)} />}
      </FormField>

      <FormField id="password" label="Password" error={err("password")} hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}>
        {(c) => (
          <div className="relative">
            <Input {...c} name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} className="pr-11" onBlur={(e) => onBlur("password", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11 md:size-10" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        )}
      </FormField>

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {mode === "login" ? (pending ? "Signing in" : "Sign in") : pending ? "Creating account" : "Create account"}
      </Button>

      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
