"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Mic, RotateCcw, Square, Timer } from "lucide-react";
import { AiTag } from "@/components/ai/ai-tag";
import { isAi, postAi } from "@/components/ai/use-ai";
import { useSpeech } from "@/components/practice/use-speech";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DIMENSIONS, DIMENSION_LABEL, SECONDS_PER_ANSWER, summarise, type Question, type Score } from "@/lib/interview";
import { cn } from "@/lib/utils";

type Stage = "start" | "loading" | "asking" | "scoring" | "feedback" | "done";
interface Result {
  question: Question;
  answer: string;
  score: Score;
  ai: boolean;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
      <span>{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-2 flex-1 rounded-full", n <= value ? "bg-primary" : "bg-border")} />
        ))}
      </span>
      <span className="tabular-nums text-muted">{value} of 5</span>
    </div>
  );
}

export function InterviewRunner({ job }: { job: { id: string; title: string; company: string } }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qAi, setQAi] = useState(false);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [left, setLeft] = useState(SECONDS_PER_ANSWER);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const answerRef = useRef("");
  const submitted = useRef(false);

  const setText = useCallback((t: string) => {
    answerRef.current = t;
    setAnswer(t);
  }, []);
  const speech = useSpeech(setText);

  async function begin() {
    setStage("loading");
    setError("");
    try {
      const r = await postAi<{ questions: Question[] }>("interview-questions", { jobId: job.id });
      setQuestions(r.data.questions);
      setQAi(isAi(r.source));
      setI(0);
      setResults([]);
      openQuestion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      setStage("start");
    }
  }

  function openQuestion() {
    submitted.current = false;
    setText("");
    setLeft(SECONDS_PER_ANSWER);
    setStage("asking");
  }

  const submit = useCallback(
    async (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      speech.stop();
      const text = answerRef.current.trim();
      const used = SECONDS_PER_ANSWER - left;
      const q = questions[i];
      if (!text) {
        // Nothing said: record it honestly instead of scoring silence.
        setResults((rs) => [...rs, { question: q, answer: "", score: { clarity: 1, structure: 1, specificity: 1, feedback: auto ? "Time ran out with no answer." : "You skipped this one.", tip: "Even two or three sentences give you something to improve on." }, ai: false }]);
        setStage("feedback");
        return;
      }
      setStage("scoring");
      try {
        const r = await postAi<Score>("interview-score", { jobId: job.id, question: q.text, kind: q.kind, answer: text, seconds: Math.max(0, used) });
        setResults((rs) => [...rs, { question: q, answer: text, score: r.data, ai: isAi(r.source) }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not score that answer.");
        submitted.current = false;
        setStage("asking");
        return;
      }
      setStage("feedback");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [left, questions, i, job.id, speech.stop],
  );

  // Countdown: one tick a second while a question is open. At zero the answer is sent as it stands.
  useEffect(() => {
    if (stage !== "asking") return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [stage]);
  useEffect(() => {
    if (stage === "asking" && left <= 0) void submit(true);
  }, [stage, left, submit]);

  function next() {
    if (i + 1 >= questions.length) setStage("done");
    else {
      setI(i + 1);
      openQuestion();
    }
  }

  const q = questions[i];
  const last = results[results.length - 1];
  const summary = summarise(results.filter((r) => r.answer).map((r) => r.score));

  return (
    <div data-testid="interview" className="grid gap-4">
      {stage === "start" && (
        <Card className="p-6">
          <h2 className="text-xl">Five questions, two minutes each</h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Questions are tailored to {job.title} at {job.company}. Answer by typing or speaking. After each answer you get a score for clarity, structure and specificity, and one thing to change. Nothing is saved: close the page and it is gone.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger-fg">
              {error}
            </p>
          )}
          <Button type="button" variant="primary" className="mt-5" onClick={begin}>
            Start the interview
          </Button>
        </Card>
      )}

      {stage === "loading" && (
        <Card className="flex items-center gap-3 p-6 text-sm text-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Preparing your questions
        </Card>
      )}

      {(stage === "asking" || stage === "scoring") && q && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>
              Question {i + 1} of {questions.length}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums" role="timer" aria-live="off" data-testid="clock">
              <Timer className="size-4" aria-hidden="true" /> {clock(Math.max(0, left))}
              {left <= 15 && left > 0 && <span className="font-medium text-warning-fg">Almost out of time</span>}
            </span>
          </div>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <motion.span className="block h-full origin-left rounded-full bg-primary" animate={{ scaleX: Math.max(0, left) / SECONDS_PER_ANSWER }} transition={reduce ? { duration: 0 } : { duration: 1, ease: "linear" }} />
          </span>

          <h2 className="mt-5 text-xl leading-snug" data-testid="question">
            {q.text}
          </h2>
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <Textarea id="answer" value={answer} onChange={(e) => setText(e.target.value)} rows={8} maxLength={3000} disabled={stage === "scoring"} placeholder="Type your answer, or press Speak." className="mt-4 text-sm" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {speech.supported &&
              (speech.listening ? (
                <Button type="button" variant="secondary" onClick={speech.stop}>
                  <Square className="size-4 fill-current" aria-hidden="true" /> Stop speaking
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => speech.start(answerRef.current)} disabled={stage === "scoring"}>
                  <Mic className="size-4" aria-hidden="true" /> Speak
                </Button>
              ))}
            <Button type="button" variant="secondary" onClick={() => void submit(false)} disabled={stage === "scoring"}>
              {stage === "scoring" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {stage === "scoring" ? "Scoring" : answer.trim() ? "Submit answer" : "Skip"}
            </Button>
          </div>
          {(error || speech.error) && (
            <p role="alert" className="mt-3 text-sm text-danger-fg">
              {error || speech.error}
            </p>
          )}
        </Card>
      )}

      {stage === "feedback" && last && (
        <Card className="p-6" data-testid="feedback">
          <p className="text-sm text-muted">
            Question {i + 1} of {questions.length}
          </p>
          <p className="mt-1 text-base font-medium">{last.question.text}</p>
          {last.answer ? (
            <div className="mt-4 grid gap-2">
              {DIMENSIONS.map((d) => (
                <Meter key={d} label={DIMENSION_LABEL[d]} value={last.score[d]} />
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed">{last.score.feedback}</p>
          <p className="mt-2 text-sm leading-relaxed">
            <span className="font-medium">Next time:</span> {last.score.tip}
          </p>
          <p className="mt-3">{last.ai ? <AiTag label="Scored by AI. It judges delivery, not whether your claims are true." /> : <span className="text-xs text-muted">Basic check from the words in your answer (AI is unavailable right now).</span>}</p>
          <Button type="button" variant="primary" className="mt-5" onClick={next}>
            {i + 1 >= questions.length ? "See the summary" : "Next question"}
          </Button>
        </Card>
      )}

      {stage === "done" && (
        <Card className="p-6" data-testid="summary">
          <h2 className="text-xl">How it went</h2>
          {summary ? (
            <>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {summary.average.toFixed(1)} <span className="text-base font-normal text-muted">out of 5 on average</span>
              </p>
              <p className="mt-1 text-sm">{summary.line}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">No answers were scored this time.</p>
          )}
          <ol className="mt-5 grid gap-3">
            {results.map((r, n) => (
              <li key={n} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{r.question.text}</p>
                <p className="mt-1 text-muted">{r.answer ? `Clarity ${r.score.clarity}, structure ${r.score.structure}, specificity ${r.score.specificity}` : "Not answered"}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">{qAi ? "Questions written by AI for this job." : "Standard questions built from the job's listed skills."}</p>
          <Button type="button" variant="secondary" className="mt-5" onClick={begin}>
            <RotateCcw className="size-4" aria-hidden="true" /> Practise again
          </Button>
        </Card>
      )}
    </div>
  );
}
