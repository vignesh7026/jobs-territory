"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} title="We could not load the queue" description="No application data was changed. Try again in a moment." />;
}
