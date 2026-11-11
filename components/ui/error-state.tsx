"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Shared body for route-level error.tsx files: says what failed, keeps the person's place, offers a retry. */
export function ErrorState({ error, reset, title, description }: { error: Error & { digest?: string }; reset: () => void; title: string; description: string }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="container py-10">
      <EmptyState icon={<AlertTriangle />} title={title} description={description}>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </EmptyState>
    </section>
  );
}
