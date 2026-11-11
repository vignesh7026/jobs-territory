import { createHash } from "node:crypto";
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
import { OUTCOME_LABEL, insightStats, plainInsightSummary } from "@/lib/insights";
import { getInsights } from "@/lib/insights-queries";
import { plainRoadmap } from "@/lib/roadmap";
import { SECONDS_PER_ANSWER, plainQuestions, plainScore } from "@/lib/interview";
import { describeRange, plainNegotiation } from "@/lib/negotiate";
import { getMarketSample } from "@/lib/negotiate-queries";
import { groundSkills, plainVoiceDraft } from "@/lib/voice-profile";

/**
 * POST /api/ai/:kind   kind = match | gap | summary | cover-letter | follow-up
 * Runs server-side only (the API key never reaches the browser). Always answers 200 with { data, source } where source is
 * "ai", "cache" or "fallback"; if the model is down the plain, non-AI result comes back instead of an error.
 * 401 signed out, 404 unknown job/application, 422 not applicable, 429 too many requests.
 */
const KINDS = ["match", "gap", "summary", "cover-letter", "follow-up", "negotiate", "voice-profile", "interview-questions", "interview-score", "roadmap", "peer-summary"] as const;
type Kind = (typeof KINDS)[number];

const jobBody = z.object({ jobId: z.string().refine(isUuid, "Invalid job id") });
const appBody = z.object({ applicationId: z.string().refine(isUuid, "Invalid application id") });
const scoreBody = jobBody.extend({ question: z.string().trim().min(5).max(300), kind: z.enum(["intro", "behavioral", "skill"]), answer: z.string().trim().min(1).max(3000), seconds: z.number().int().min(0).max(900) });
const roadmapBody = z.object({ weeks: z.number().int().min(2).max(8) });
const peerBody = z.object({ companyId: z.string().refine(isUuid, "Invalid company id"), company: z.string().trim().min(1).max(120) });
const voiceBody = z.object({ transcript: z.string().trim().min(40).max(4000) });
const negotiateBody = appBody.extend({ offer: z.string().trim().max(40).optional() });
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

    case "interview-score": {
      const parsed = scoreBody.safeParse(body);
      if (!parsed.success) return err("Write or say an answer first.", 400);
      const job = await loadJob(parsed.data.jobId);
      if (!job) return err("Job not found.", 404);
      const a = { job: job.ai, question: parsed.data.question, kind: parsed.data.kind, answer: parsed.data.answer, seconds: parsed.data.seconds, limit: SECONDS_PER_ANSWER };
      const p = prompts.interviewScore(a);
      const hash = createHash("sha256").update(a.question + "\n" + a.answer).digest("hex");
      const r = await ai({ kind: "interview-score", jobId: job.id, inputKey: `${user.id}:${hash}`, schema: schemas.interviewScore, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainScore(a.answer, a.kind) });
      return reply(r.data, r.source);
    }

    case "interview-questions": {
      const parsed = jobBody.safeParse(body);
      if (!parsed.success) return err("Invalid job id.", 400);
      const job = await loadJob(parsed.data.jobId);
      if (!job) return err("Job not found.", 404);
      const p = prompts.interviewQuestions(job.ai);
      const r = await ai({ kind: "interview-questions", jobId: job.id, schema: schemas.interviewQuestions, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: { questions: plainQuestions(job.ai) } });
      return reply(r.data, r.source);
    }

    case "peer-summary": {
      const parsed = peerBody.safeParse(body);
      if (!parsed.success) return err("Invalid company.", 400);
      const notes = await getInsights(parsed.data.companyId);
      const plain = { lines: plainInsightSummary(insightStats(notes)) as [string, string, string] };
      if (notes.length < 2) return reply(plain, "fallback"); // too little to summarise: the plain lines are the honest answer
      const p = prompts.peerSummary({ company: parsed.data.company, notes: notes.map((n) => ({ role: n.roleTitle, rounds: n.rounds, difficulty: n.difficulty, outcome: OUTCOME_LABEL[n.outcome], text: n.experience })) });
      const r = await ai({ kind: "peer-summary", inputKey: `${parsed.data.companyId}:${notes.length}:${notes[0].createdAt}`, schema: schemas.peerSummary, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plain });
      return reply(r.data, r.source);
    }

    case "voice-profile": {
      const parsed = voiceBody.safeParse(body);
      if (!parsed.success) return err("Say or type a little more about yourself (at least a couple of sentences).", 400);
      const transcript = parsed.data.transcript;
      const p = prompts.voiceProfile(transcript);
      const r = await ai({ kind: "voice-profile", inputKey: `${user.id}:${createHash("sha256").update(transcript).digest("hex")}`, schema: schemas.voiceProfile, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainVoiceDraft(transcript) });
      // Whatever the model returned, only skills the person actually named are kept.
      return reply({ ...r.data, skills: groundSkills(r.data.skills, transcript) }, r.source);
    }

    case "negotiate": {
      const parsed = negotiateBody.safeParse(body);
      if (!parsed.success) return err("Invalid request.", 400);
      const app = await getApplication(parsed.data.applicationId);
      if (!app || app.candidateId !== user.id) return err("Application not found.", 404);
      if (app.status !== "offered") return err("A negotiation draft is only available once you have an offer.", 422);
      const [job, profile, sample] = await Promise.all([loadJob(app.job.id), loadProfile(user.id), getMarketSample(app.job.id)]);
      if (!job || !profile) return err("Could not load the details for this draft.", 404);
      const range = sample ? describeRange(sample.range, sample.monthly) : null;
      const input = { job: { title: job.ai.title, company: job.ai.company }, firstName: profile.ai.firstName, offer: parsed.data.offer ?? "", range };
      const p = prompts.negotiate(input);
      const r = await ai({ kind: "negotiate", jobId: job.id, inputKey: `${user.id}:${app.id}:${input.offer}:${range ?? ""}`, schema: schemas.negotiate, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: plainNegotiation({ firstName: input.firstName, offer: input.offer, range: input.range, jobTitle: job.ai.title, company: job.ai.company }) });
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
      if (kind === "roadmap") {
        const weeks = roadmapBody.safeParse(body);
        const n = weeks.success ? weeks.data.weeks : 6;
        const input = { job: job.ai, have: match.matched, missing: match.missing, weeks: n };
        const p = prompts.roadmap(input);
        const r = await ai({ kind: "roadmap", jobId: job.id, profileVersion: profile.version, inputKey: String(n), schema: schemas.roadmap, system: SYSTEM, user: p.user, maxTokens: p.maxTokens, fallback: { weeks: plainRoadmap(match.missing, n) } });
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
