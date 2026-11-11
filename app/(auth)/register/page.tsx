import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const { next } = await props.searchParams;
  const target = typeof next === "string" ? safeNext(next, "") || undefined : undefined;
  return (
    <section className="container py-12 md:py-16">
      <div className="max-w-md">
        <h1 className="text-3xl">Create your account</h1>
        <p className="mb-8 mt-2 text-muted">One profile for every application. You can add your resume and skills after this step.</p>
        <AuthForm mode="register" next={target} />
      </div>
    </section>
  );
}
