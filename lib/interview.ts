import { skillsNamedIn } from "@/lib/voice-profile";

// Mock interview, the plain (non-AI) parts: a fallback set of questions and a transparent scorer. Everything the
// scorer looks at is shown to the candidate in words, so the numbers never feel like a black box.

export const SECONDS_PER_ANSWER = 120;

export type QuestionKind = "intro" | "behavioral" | "skill";
export interface Question {
  kind: QuestionKind;
  text: string;
}

export interface InterviewJob {
  title: string;
  company: string;
  skills: string[];
}

/** Five questions: why you, two about past behaviour, two about the skills the job lists. */
export function plainQuestions(job: InterviewJob): Question[] {
  const [s1, s2] = job.skills;
  return [
    { kind: "intro", text: `Tell me about yourself and why you want the ${job.title} role at ${job.company}.` },
    { kind: "behavioral", text: "Describe a time you had to learn something new quickly to get a piece of work done. What did you do and what happened?" },
    { kind: "skill", text: s1 ? `Walk me through how you have used ${s1} in a real project. What was hard about it?` : "Walk me through a project you are proud of. What was hard about it?" },
    { kind: "behavioral", text: "Tell me about a time you disagreed with a teammate or received difficult feedback. How did you handle it?" },
    { kind: "skill", text: s2 ? `How would you approach a problem where ${s2} is the main tool, and you are not sure of the best solution?` : "How do you decide what to do first when you have more work than time?" },
  ];
}

export interface Score {
  clarity: number;
  structure: number;
  specificity: number;
  /** two plain sentences */
  feedback: string;
  /** one concrete thing to do on the next attempt */
  tip: string;
}

export const DIMENSIONS = ["clarity", "structure", "specificity"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_LABEL: Record<Dimension, string> = { clarity: "Clarity", structure: "Structure", specificity: "Specificity" };

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const FILLERS = /\b(um+|uh+|like|basically|you know|actually|sort of|kind of)\b/gi;

const STAGES: Record<string, RegExp> = {
  situation: /\b(when|at my (last|previous|current)|in my (last|previous)|we were|the problem|the situation|our team)\b/i,
  task: /\b(my role|i was responsible|i needed to|i had to|the goal|my job was|i was asked)\b/i,
  action: /\b(i decided|i built|i wrote|i implemented|i led|i set up|i started|i asked|i proposed|so i|i created|i fixed|i tested)\b/i,
  result: /\b(as a result|which led|the outcome|resulted|reduced|improved|increased|saved|shipped|in the end|we (got|launched|cut))\b/i,
};
const SEQUENCE = /\b(first|then|next|finally|because|trade-?off|so that|after that)\b/i;

/** Observations about an answer, used both for scoring and for the written feedback. */
export function inspectAnswer(answer: string) {
  const w = words(answer);
  const sentences = answer.split(/[.!?]+/).map((s) => words(s).length).filter((n) => n > 0);
  const avgSentence = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  const fillers = (answer.match(FILLERS) ?? []).length;
  const stages = Object.entries(STAGES).filter(([, re]) => re.test(answer)).map(([k]) => k);
  const numbers = w.filter((t) => /\d/.test(t)).length;
  const skills = skillsNamedIn(answer).length;
  const example = /\b(for example|for instance|such as|specifically)\b/i.test(answer);
  return { wordCount: w.length, avgSentence, fillers, stages, sequenced: SEQUENCE.test(answer), numbers, skills, example };
}

export function plainScore(answer: string, kind: QuestionKind): Score {
  const o = inspectAnswer(answer);

  let clarity = 3;
  if (o.wordCount >= 50 && o.avgSentence >= 8 && o.avgSentence <= 24) clarity += 1;
  if (o.wordCount >= 60 && o.fillers === 0) clarity += 1;
  if (o.avgSentence > 35) clarity -= 1;
  if (o.fillers >= 4) clarity -= 1;
  if (o.wordCount < 25) clarity = Math.min(clarity, 2);

  const structure = kind === "behavioral" || kind === "intro" ? 1 + o.stages.length + (o.sequenced ? 0.5 : 0) : 1 + (o.sequenced ? 2 : 0) + Math.min(2, o.stages.length);
  const specificity = 1 + Math.min(4, o.numbers + o.skills + (o.example ? 1 : 0));

  const scores = { clarity: clamp(clarity), structure: clamp(structure), specificity: clamp(specificity) };
  return { ...scores, ...writeFeedback(scores, o, kind) };
}

function writeFeedback(s: Record<Dimension, number>, o: ReturnType<typeof inspectAnswer>, kind: QuestionKind): { feedback: string; tip: string } {
  const ranked = [...DIMENSIONS].sort((a, b) => s[a] - s[b]);
  const weakest = ranked[0];
  const strongest = ranked[2];

  const praise: Record<Dimension, string> = {
    clarity: "Your answer was easy to follow.",
    structure: "You gave the answer a clear shape.",
    specificity: "You backed it up with concrete detail.",
  };
  const gap: Record<Dimension, string> = {
    clarity: o.wordCount < 25 ? `At ${o.wordCount} words it is too short to judge well.` : o.fillers >= 4 ? `Filler words came up ${o.fillers} times.` : "Some sentences ran long.",
    structure: kind === "skill" ? "It did not walk through the steps in order." : `It never reached the ${["situation", "task", "action", "result"].find((x) => !o.stages.includes(x))} part of the story.`,
    specificity: "It stayed general, with no numbers, tools or example.",
  };
  const tip: Record<Dimension, string> = {
    clarity: "Aim for 80 to 150 words in sentences under 25 words, and pause instead of saying um.",
    structure: kind === "skill" ? "Say first, then, finally, and give one reason for your main choice." : "Use four beats: the situation, your task, what you did, and the result.",
    specificity: "Add one number (how many, how long, how much better) and name the tool you used.",
  };
  return { feedback: `${praise[strongest]} ${gap[weakest]}`, tip: tip[weakest] };
}

export interface Summary {
  average: number;
  strongest: Dimension;
  weakest: Dimension;
  line: string;
}

/** Overall result across all answered questions. null when nothing was answered. */
export function summarise(scores: Score[]): Summary | null {
  if (scores.length === 0) return null;
  const mean = (d: Dimension) => scores.reduce((a, s) => a + s[d], 0) / scores.length;
  const ranked = [...DIMENSIONS].sort((a, b) => mean(a) - mean(b));
  const average = Math.round((DIMENSIONS.reduce((a, d) => a + mean(d), 0) / 3) * 10) / 10;
  const weakest = ranked[0];
  const strongest = ranked[2];
  return { average, strongest, weakest, line: `Strongest: ${DIMENSION_LABEL[strongest].toLowerCase()}. Work on next: ${DIMENSION_LABEL[weakest].toLowerCase()}.` };
}
