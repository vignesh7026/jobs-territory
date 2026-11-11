import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="container pb-12 pt-6 lg:pt-8" aria-busy="true" aria-label="Loading job">
      <Skeleton className="h-9 w-24" />
      <div className="mt-2 grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="grid max-w-prose gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-4 h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="hidden h-48 w-full lg:block" />
      </div>
    </section>
  );
}
