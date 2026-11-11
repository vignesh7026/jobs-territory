import { NextResponse } from "next/server";
import { z } from "zod";
import { ai } from "@/lib/ai";
import { isUuid, loadJob, loadProfile } from "@/lib/ai/context";
import { SYSTEM, plainCoverLetter, plainFollowUp, plainGaps, plainSummary, prompts, schemas } from "@/lib/ai/features";
import { allow } from "@/lib/ai/rate-limit";
import { applicationHealth } from "@/lib/applications/health";
import { getApplication } from "@/lib/applications/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { computeMatch, fallbackExplanation } from "@/lib/match";

/**
 * POST /api/ai/:kind   kind = match | gap | summary | cover-letter | follow-up
 * Runs server-side only (the API key never reaches the browser). Always answers 200 with { data, source } where source is
 * "ai", "cache" or "fallback"; if the model is down the plain, non-AI result comes back instead of an error.
 * 401 signed out, 404 unknown job/application, 422 not applicable, 429 too many requests.
 */
const KINDS = ["match", "gap", "summary", "cover-letter", "follow-up"] as const;
type Kind = (typeof KINDS)[number];

const jobBody = z.object({ jobId: z.string().refine(isUuid, "Invalid job id") });
const appBody = z.object({ applicationId: z.string().refine(isUuid, "Invalid application id") });
const reply = (data: unknown, source: string) => NextResponse.json({ data, source }, { headers: { "Cache-Control": "private, no-store" } });
const err = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request, ctx: RouteContext<"/api/ai/[kind]">) {
  const { kind } = await ctx.params;
  if (!(KINDS as readonly string[]).includes(kind)) return err("Unknown AI feature.", 404);

  const user = await getCurrentUser();
  if (!user) return err("Sign in to use this feature.", 401);
  if (!allow(user.id)) return err("Too many requests. Wait a minute and try again.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Send JSON.", 400);
  }

  switch (kind as Kind) {
    case "follow-up": {
      const parsed = appBody.safeParse(body);
      if (!parsed.success) return err("Invalid application id.", 400);
      const app = await getApplication(parsed.data.applicationId);
      if (!app || app.candidateId !== user.id) return err("Application not found.", 404);
      if (!applicationHealth(app.status, app.updatedAt)) return err("There is nothing to follow up on a rejected application.", 422);
      const [job, profile] = await Promise.all([loadJob(app.job.id), loadProfile(user.id)]);
      if (!job || !profile) return err("Could not load the details for this draft.", 404);

      const quietDays = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / 864e5);
      const input = { job: job.ai, status: app.status, appliedOn: app.createdAt, daysSinceUpdate: quietDays, firstName: profile.ai.firstName };
      const p = prompts.followUp(input);
      const r = await ai({ kind: "follow-up", jobId: job.id, inputKey: `${app.id}:${app.status}:${app.updatedAt.slice(0, 10)}`, schema: schemas.followUp, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainFollowUp(input) });
      return reply(r.data, r.source);
    }

    default: {
      const parsed = jobBody.safeParse(body);
      if (!parsed.success) return err("Invalid job id.", 400);
      const job = await loadJob(parsed.data.jobId);
      if (!job) return err("Job not found.", 404);

      if (kind === "summary") {
        const p = prompts.summary(job.ai);
        const r = await ai({ kind: "summary", jobId: job.id, schema: schemas.summary, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainSummary(job.ai) });
        return reply(r.data, r.source);
      }

      const profile = await loadProfile(user.id);
      if (!profile) return err("Could not load your profile.", 404);
      const match = computeMatch(profile.match, job.match);

      if (kind === "match") {
        const p = prompts.match(job.ai, match);
        const r = await ai({ kind: "match", jobId: job.id, profileVersion: profile.version, schema: schemas.match, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: { lines: fallbackExplanation(match, job.ai.skills.length) } });
        return reply(r.data, r.source);
      }
      if (kind === "gap") {
        const p = prompts.gap(job.ai, match);
        const r = await ai({ kind: "gap", jobId: job.id, profileVersion: profile.version, schema: schemas.gap, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainGaps(match) });
        return reply(r.data, r.source);
      }
      // cover-letter
      const p = prompts.coverLetter(job.ai, profile.ai);
      const r = await ai({ kind: "cover-letter", jobId: job.id, profileVersion: profile.version, schema: schemas.coverLetter, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainCoverLetter(job.ai, profile.ai, match) });
      return reply(r.data, r.source);
    }
  }
}
