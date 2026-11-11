import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { CompanyMark } from "@/components/jobs/job-row";
import { Card } from "@/components/ui/card";
import type { CompanyContact } from "@/lib/jobs/detail";

const KIND_LABEL = { recruiter: "Recruiter", founder: "Founder" } as const;

/** Who to write to about this job: the recruiter first, then the founder. Contacts are only loaded for signed-in users. */
export function ReachOut({ contacts, jobTitle, company, signInHref }: { contacts: CompanyContact[]; jobTitle: string; company: string; signInHref: string | null }) {
  if (signInHref) {
    return (
      <Card className="p-5">
        <h2 className="text-base">Reach out</h2>
        <p className="mt-2 text-sm text-muted">
          The recruiter and founder at {company} are listed for signed-in candidates.{" "}
          <Link href={signInHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in to see them
          </Link>
        </p>
      </Card>
    );
  }
  if (contacts.length === 0) return null;
  return (
    <Card className="p-5">
      <h2 className="text-base">Reach out</h2>
      <ul className="mt-3 grid gap-4">
        {contacts.map((c) => (
          <li key={c.kind} className="flex gap-3">
            <CompanyMark name={c.name} className="size-10" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{KIND_LABEL[c.kind]}</p>
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.title}</p>
              <div className="mt-2 grid gap-1 text-sm">
                <a
                  href={`mailto:${c.email}?subject=${encodeURIComponent(`${jobTitle} application`)}`}
                  className="inline-flex min-h-9 items-center gap-1.5 break-all text-primary underline-offset-4 hover:underline"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" /> {c.email}
                </a>
                <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                  <ExternalLink className="size-4 shrink-0" aria-hidden="true" /> View profile<span className="sr-only"> of {c.name} (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">Mention the role in your first line and attach nothing until they reply.</p>
    </Card>
  );
}
