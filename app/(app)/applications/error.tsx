"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ApplicationsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} title="We could not load your applications" description="Nothing has been lost; your applications are safe. This is a problem on our side. Try again in a moment." />;
}
