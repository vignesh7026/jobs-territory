"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Error state with a retry. Shown if the search itself fails (network, database).
export default function JobsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="container py-10">
      <EmptyState icon={<AlertTriangle />} title="We could not load jobs" description="Something went wrong on our side. Your search is unchanged. Try again in a moment.">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </EmptyState>
    </section>
  );
}
