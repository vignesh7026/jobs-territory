import { JobRowSkeleton } from "@/components/jobs/results";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while the jobs page loads for the first time or after a full navigation.
export default function Loading() {
  return (
    <section className="container py-8 md:py-10" aria-busy="true" aria-label="Loading jobs">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mb-8 mt-5 h-16 w-full" />
      <div className="grid items-start gap-6 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <div className="hidden gap-3 lg:grid">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-28 w-full" />
        </div>
        <ul className="grid gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <JobRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
