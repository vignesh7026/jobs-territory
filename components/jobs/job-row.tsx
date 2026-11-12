"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Building2, Clock, Laptop, MapPin, TriangleAlert } from "lucide-react";
import { CompareToggle } from "@/components/compare/compare-toggle";
import { SaveButton } from "@/components/saved/save-button";
import { useRouter } from "next/navigation";
import { QuickApplyButton } from "@/components/jobs/quick-apply-button";
import { Tilt } from "@/components/jobs/tilt";
import { MORPH_JOB_ATTR, VT_NAMES, morphToJob } from "@/lib/morph";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/jobs/verified-badge";
import { GHOST_LABEL, ghostCheck } from "@/lib/ghost";
import { t } from "@/lib/motion";
import { LEVEL_LABELS, MODE_LABELS, TYPE_LABELS, type WorkMode } from "@/lib/jobs/filters";
import { daysUntil, formatSalary, timeAgo } from "@/lib/format";
import type { JobListItem } from "@/lib/jobs/queries";

const MODE_ICON: Record<WorkMode, React.ReactNode> = { onsite: <Building2 />, hybrid: <ArrowLeftRight />, remote: <Laptop /> };

export function CompanyMark({ name, className = "size-11", ...rest }: { name: string; className?: string } & React.ComponentProps<"span">) {
  return (
    <span aria-hidden="true" {...rest} className={`grid shrink-0 place-items-center rounded-md border border-border bg-bg font-heading text-base font-bold text-muted ${className}`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * One result. A dense row, not a card: the list is meant to be scanned.
 * The first eight rows fade in with a 40 ms stagger; later ones appear immediately.
 */
export function JobRow({ job, index, match, saved, signedIn, quick }: { job: JobListItem; index: number; match?: number; saved?: boolean; signedIn?: boolean; quick?: boolean }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const closing = daysUntil(job.closesAt);
  const ghost = ghostCheck(job);
  // Coming back from this job's page: name this row so the page's logo and title morph into it.
  const morphBack = typeof document !== "undefined" && document.documentElement.getAttribute(MORPH_JOB_ATTR) === job.id;

  return (
    <motion.li
      className="relative"
      data-job-row={job.id}
      layout={!reduce}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ ...t.base, delay: index < 8 ? index * 0.04 : 0 }}
    >
      <Tilt>
      <Link
        href={`/jobs/${job.slug}`}
        onClick={(e) => morphToJob(e, router, `/jobs/${job.slug}`)}
        className="group grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[auto_1fr_auto]"
      >
        <CompanyMark name={job.company.name} data-vt-mark style={morphBack ? { viewTransitionName: VT_NAMES.MARK } : undefined} />

        <div className="min-w-0 pr-20 sm:pr-0">
          <h2 className="text-base font-semibold leading-snug group-hover:text-primary" data-vt-title style={morphBack ? { viewTransitionName: VT_NAMES.TITLE } : undefined}>
            {job.title}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="font-medium text-text">{job.company.name}</span>
            <VerifiedBadge verified={job.company.verified} />
            <span aria-hidden="true">&middot;</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" /> {job.location}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className="[&_svg]:size-3.5">
              {MODE_ICON[job.workMode]} {MODE_LABELS[job.workMode]}
            </Badge>
            <Badge>{TYPE_LABELS[job.jobType]}</Badge>
            <Badge>{LEVEL_LABELS[job.level]}</Badge>
            {ghost.level !== "none" && (
              <Badge variant="warning" title={ghost.reasons.join(" ")}>
                <TriangleAlert /> {GHOST_LABEL[ghost.level]}
              </Badge>
            )}
            {closing !== null && closing <= 7 && (
              <Badge variant="warning">
                <Clock /> {closing === 0 ? "Closes today" : `Closes in ${closing} ${closing === 1 ? "day" : "days"}`}
              </Badge>
            )}
          </div>
        </div>

        <div className="col-span-2 flex items-baseline justify-between gap-4 border-t border-border pt-2 sm:col-span-1 sm:mr-20 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <p className="text-sm font-medium tabular-nums">{formatSalary(job.salaryMin, job.salaryMax, job.currency, job.jobType)}</p>
          <p className="text-xs text-muted sm:mt-1">{timeAgo(job.postedAt)}</p>
          {match !== undefined && (
            <p className="text-xs font-medium tabular-nums text-primary sm:mt-1" title="Share of the listed skills that are on your profile">
              {match}% skills match
            </p>
          )}
        </div>
      </Link>
      </Tilt>
      {quick && (
        <div className="mt-2 flex justify-end">
          <QuickApplyButton jobId={job.id} jobTitle={job.title} company={job.company.name} />
        </div>
      )}
      {/* Outside the link on purpose: interactive controls cannot live inside an anchor. */}
      <div className="absolute right-2 top-2 flex">
        <CompareToggle item={{ id: job.id, title: job.title, company: job.company.name }} />
        <SaveButton jobId={job.id} jobTitle={job.title} initialSaved={Boolean(saved)} signedIn={Boolean(signedIn)} />
      </div>
    </motion.li>
  );
}
