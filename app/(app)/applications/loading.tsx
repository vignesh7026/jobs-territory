import { JobRowSkeleton } from "@/components/jobs/results";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="container py-8 md:py-10" aria-busy="true" aria-label="Loading applications">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mb-6 mt-3 h-5 w-96 max-w-full" />
      <Skeleton className="h-11 w-full max-w-xl" />
      <ul className="mt-6 grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <JobRowSkeleton key={i} />
        ))}
      </ul>
    </section>
  );
}
