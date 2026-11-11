import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container py-16 md:py-24">
      <div className="max-w-lg">
        <p className="text-sm font-medium text-muted">Error 404</p>
        <h1 className="mt-2 text-3xl">We could not find that page</h1>
        <p className="mt-3 text-muted">The link may be out of date, or the job may have been removed. Search the current listings instead.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/jobs" className={buttonVariants({ variant: "primary" })}>
            Browse jobs
          </Link>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}
