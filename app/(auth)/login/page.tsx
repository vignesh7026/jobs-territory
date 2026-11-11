import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const target = typeof next === "string" ? safeNext(next, "") || undefined : undefined;
  return (
    <section className="container py-12 md:py-16">
      <div className="max-w-md">
        <h1 className="text-3xl">Sign in</h1>
        <p className="mb-8 mt-2 text-muted">Pick up where you left off: your applications, saved jobs and profile.</p>
        <AuthForm mode="login" next={target} />
      </div>
    </section>
  );
}
