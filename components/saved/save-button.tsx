"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { setJobSaved } from "@/app/(app)/saved/actions";
import { useToast } from "@/components/shell/toaster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  jobId: string;
  jobTitle: string;
  initialSaved: boolean;
  signedIn: boolean;
  variant?: "icon" | "button";
  className?: string;
}

/** Bookmark toggle. Updates instantly, rolls back and says so if the server refuses, and every removal has an Undo. */
export function SaveButton({ jobId, jobTitle, initialSaved, signedIn, variant = "icon", className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const label = saved ? `Remove ${jobTitle} from saved jobs` : `Save ${jobTitle}`;

  function change(next: boolean, announce = true) {
    setSaved(next); // optimistic
    start(async () => {
      const r = await setJobSaved(jobId, next);
      if (!r.ok) {
        setSaved(!next);
        toast({ title: "Not saved", description: r.message, tone: "error" });
        return;
      }
      if (announce) {
        toast({
          title: next ? "Saved" : "Removed from saved jobs",
          description: jobTitle,
          tone: next ? "success" : "default",
          action: { label: "Undo", onClick: () => change(!next, false) },
        });
      }
      router.refresh();
    });
  }

  if (!signedIn) {
    return variant === "icon" ? (
      <Link href={loginHref} aria-label={`Sign in to save ${jobTitle}`} title="Sign in to save" className={cn("grid size-11 place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-primary-soft hover:text-text md:size-9", className)}>
        <Bookmark className="size-4" aria-hidden="true" />
      </Link>
    ) : (
      <Link href={loginHref} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-primary-soft md:h-10", className)}>
        <Bookmark className="size-4" aria-hidden="true" /> Sign in to save
      </Link>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => change(!saved)}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        title={saved ? "Saved" : "Save"}
        className={cn("grid size-11 place-items-center rounded-md transition-colors duration-fast hover:bg-primary-soft md:size-9", saved ? "text-primary" : "text-muted hover:text-text", className)}
      >
        {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
      </button>
    );
  }
  return (
    <Button variant="secondary" onClick={() => change(!saved)} disabled={pending} aria-pressed={saved} className={className}>
      {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />} {saved ? "Saved" : "Save job"}
    </Button>
  );
}
