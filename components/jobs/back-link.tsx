"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { morphToList } from "@/lib/morph";

/** "All jobs" on a job page. Where supported, the logo and title morph back into this job's row on the list. */
export function BackLink({ jobId }: { jobId: string }) {
  const router = useRouter();
  return (
    <Link href="/jobs" onClick={(e) => morphToList(e, router, jobId)} className="inline-flex h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-fast hover:text-text md:h-9">
      <ArrowLeft className="size-4" aria-hidden="true" /> All jobs
    </Link>
  );
}
