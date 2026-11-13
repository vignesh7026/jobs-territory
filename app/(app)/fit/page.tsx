import type { Metadata } from "next";
import { JdCheck } from "@/components/match/jd-check";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Check a job description" };

export default async function FitPage() {
  await requireUser("/fit");
  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Check a job description</h1>
      <p className="mb-8 mt-2 max-w-prose text-muted">
        Found a role somewhere else? Paste its description and see your profile compared with it: a score out of 100, how it adds up, and exactly what is missing from your profile.
      </p>
      <JdCheck />
    </section>
  );
}
