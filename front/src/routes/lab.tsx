/* eslint-disable prettier/prettier */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { labStore } from "@/lib/lab-store";
import { sampleLab, labToTpData } from "@/lib/lab-data";
import { QuestionCard } from "@/components/QuestionCard";
import { InstructorChat } from "@/components/InstructorChat";
import { VerificationModal } from "@/components/VerificationModal";
import { AgentBFeedback } from "@/components/Agentfeedback";
import type { FeedbackState } from "@/components/Agentfeedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Lab Workspace — LabForge" },
      { name: "description", content: "Work through your lab part by part." },
    ],
  }),
  component: LabPage,
});

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function LabPage() {
  const navigate = useNavigate();
  const lab = useMemo(() => labStore.getLab() ?? sampleLab, []);

  useEffect(() => {
    if (!labStore.getLab()) labStore.setLab(sampleLab);
  }, []);

  const [partIndex, setPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => labStore.getAllAnswers());
  const [executed, setExecuted] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittingLab, setSubmittingLab] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalEvaluation, setFinalEvaluation] = useState<{
    grade: number;
    feedback: string;
    improvement_suggestions?: string[];
  } | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const questionStartedAtRef = useRef<Record<string, number>>({});

  // Agent B state per question
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackState>>({});

  // Verification modal state
  const [verificationModal, setVerificationModal] = useState<{
    open: boolean;
    questionId: string;
    verificationQuestion: string;
  }>({ open: false, questionId: "", verificationQuestion: "" });

  const currentPart = lab.parts[partIndex];
  const isLastPart = partIndex === lab.parts.length - 1;

  // A question is "done" when its feedback verdict is accepted or verification_passed
  const isQuestionDone = useCallback((id: string) => {
    const fb = feedbacks[id];
    if (!fb) return false;
    return fb.verdict === "accepted" || fb.verdict === "verification_passed";
  }, [feedbacks]);

  const partComplete = currentPart.questions.every((q) => isQuestionDone(q.id));

  const activeQuestionId = useMemo(() => {
    const idx = currentPart.questions.findIndex((q) => !isQuestionDone(q.id));
    return idx >= 0 ? currentPart.questions[idx].id : null;
  }, [currentPart.questions, isQuestionDone]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Ensure backend session exists (direct /lab visit or legacy client state)
  useEffect(() => {
    if (labStore.getSessionId()) return;
    const lab = labStore.getLab() ?? sampleLab;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/lab/bootstrap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tp_data: labToTpData(lab) }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.session_id) labStore.setSessionId(data.session_id);
      } catch {
        /* offline — per-question submit will fall back to demo behavior */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start timer when a question becomes the active one
  useEffect(() => {
    if (!activeQuestionId) return;
    if (!questionStartedAtRef.current[activeQuestionId]) {
      questionStartedAtRef.current[activeQuestionId] = Date.now();
    }
    setNowTick(Date.now());
  }, [activeQuestionId]);

  const markQuestionStart = (id: string) => {
    if (!questionStartedAtRef.current[id]) {
      questionStartedAtRef.current[id] = Date.now();
    }
  };

  /** After a failed attempt, time spent for the next submit should count from this moment. */
  const restartQuestionTimer = (id: string) => {
    questionStartedAtRef.current[id] = Date.now();
    setNowTick(Date.now());
  };

  const updateAnswer = (id: string, v: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: v };
      labStore.setAnswer(id, v);
      return next;
    });
  };

  const executeQuestion = async (questionId: string) => {
    const sessionId = labStore.getSessionId();
    const answer = answers[questionId] ?? "";

    if (!answer.trim()) return;

    const started = questionStartedAtRef.current[questionId];
    const timeSpent = started ? Math.round((Date.now() - started) / 1000) : 0;

    // Show loading state
    setFeedbacks((prev) => ({ ...prev, [questionId]: { verdict: "submitting" } }));

    try {
      if (!sessionId) {
        // Demo mode — no backend session, simulate accepted
        await new Promise((r) => setTimeout(r, 800));
        setFeedbacks((prev) => ({
          ...prev,
          [questionId]: {
            verdict: "accepted",
            message: "Demo mode: answer accepted. Connect a backend session for real evaluation.",
          },
        }));
        setExecuted((prev) => ({ ...prev, [questionId]: true }));
        return;
      }

      const res = await fetch(`${API_BASE}/api/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          student_answer: answer,
          time_spent_seconds: timeSpent,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();
      handleVerdict(questionId, data);
    } catch (err) {
      restartQuestionTimer(questionId);
      setFeedbacks((prev) => ({
        ...prev,
        [questionId]: {
          verdict: "wrong",
          message: err instanceof Error ? err.message : "Failed to evaluate answer.",
        },
      }));
    }
  };

  const handleVerdict = (questionId: string, data: {
    verdict: string;
    message: string;
    hint?: string;
    verification_question?: string;
    explanation?: string;
  }) => {
    const { verdict, message, hint, verification_question, explanation } = data;

    switch (verdict) {
      case "accepted":
        setFeedbacks((prev) => ({ ...prev, [questionId]: { verdict: "accepted", message } }));
        setExecuted((prev) => ({ ...prev, [questionId]: true }));
        scrollToNext(questionId);
        break;

      case "wrong":
        restartQuestionTimer(questionId);
        setFeedbacks((prev) => ({
          ...prev,
          [questionId]: { verdict: "wrong", message, hint },
        }));
        break;

      case "suspicious":
        setFeedbacks((prev) => ({
          ...prev,
          [questionId]: {
            verdict: "suspicious",
            message,
            verificationQuestion: verification_question ?? "",
          },
        }));
        // Open modal after a brief delay so feedback renders first
        setTimeout(() => {
          setVerificationModal({
            open: true,
            questionId,
            verificationQuestion: verification_question ?? "",
          });
        }, 400);
        break;

      case "verification_passed":
        setFeedbacks((prev) => ({ ...prev, [questionId]: { verdict: "verification_passed", message } }));
        setExecuted((prev) => ({ ...prev, [questionId]: true }));
        scrollToNext(questionId);
        break;

      case "verification_failed":
        restartQuestionTimer(questionId);
        setFeedbacks((prev) => ({
          ...prev,
          [questionId]: { verdict: "verification_failed", message, explanation },
        }));
        break;

      default:
        restartQuestionTimer(questionId);
        setFeedbacks((prev) => ({
          ...prev,
          [questionId]: { verdict: "wrong", message: message || "Unexpected response." },
        }));
    }
  };

  const handleVerificationSubmit = async (response: string) => {
    const sessionId = labStore.getSessionId();
    const { questionId } = verificationModal;

    if (!sessionId) {
      throw new Error("No session — refresh the page or restart the lab from home.");
    }

    const res = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        student_response: response,
      }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();

    // Update feedback inline too (will be reflected after modal closes)
    handleVerdict(questionId, data);

    return {
      verdict: data.verdict,
      message: data.message,
      explanation: data.explanation,
    };
  };

  const handleVerificationClose = () => {
    setVerificationModal((prev) => ({ ...prev, open: false }));
  };

  const scrollToNext = (doneQuestionId: string) => {
    // Find next unanswered question
    const allQs = currentPart.questions;
    const idx = allQs.findIndex((q) => q.id === doneQuestionId);
    const next = allQs[idx + 1];
    if (next) {
      setTimeout(() => {
        document.getElementById(`q-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        markQuestionStart(next.id);
      }, 300);
    }
  };

  const goNext = () => {
    if (!partComplete) return;
    setPartIndex((i) => Math.min(i + 1, lab.parts.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Mark first question of next part
    const nextPart = lab.parts[partIndex + 1];
    if (nextPart?.questions[0]) {
      markQuestionStart(nextPart.questions[0].id);
    }
  };

  const buildFinalCodeBundle = () => {
    const lines: string[] = [`// Lab: ${lab.title}`, ""];
    for (const part of lab.parts) {
      lines.push(`// --- Part ${part.part}: ${part.title} ---`);
      for (const q of part.questions) {
        const a = answers[q.id]?.trim();
        lines.push(`// Q ${q.id}: ${q.task}`);
        lines.push(a || "// (no submission)");
        lines.push("");
      }
    }
    return lines.join("\n");
  };

  const handleSubmit = async () => {
    if (!partComplete || submittingLab) return;
    setSubmitError(null);
    const sessionId = labStore.getSessionId();
    const finalCode = buildFinalCodeBundle();

    if (sessionId) {
      setSubmittingLab(true);
      try {
        const res = await fetch(`${API_BASE}/api/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            final_code: finalCode,
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(typeof errBody.detail === "string" ? errBody.detail : "Submit failed");
        }
        const data = await res.json();
        setFinalEvaluation({
          grade: data.grade,
          feedback: data.feedback ?? "",
          improvement_suggestions: data.improvement_suggestions,
        });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Could not submit lab.");
        setSubmittingLab(false);
        return;
      }
      setSubmittingLab(false);
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SubmittedView
        title={lab.title}
        evaluation={finalEvaluation}
        onRestart={() => navigate({ to: "/" })}
      />
    );
  }

  const totalQuestions = lab.parts.reduce((s, p) => s + p.questions.length, 0);
  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Title bar */}
      <div className="flex h-9 items-center justify-between border-b border-border bg-[oklch(0.13_0.02_270)] px-3 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-destructive/80" />
            <span className="size-3 rounded-full bg-accent/80" />
            <span className="size-3 rounded-full bg-success/80" />
          </div>
          <Link to="/" className="ml-3 flex items-center gap-1.5">
            <div className="size-3.5 rounded-sm bg-gradient-brand" />
            <span className="font-bold text-foreground">LabForge IDE</span>
          </Link>
        </div>
        <div className="hidden truncate md:block">{lab.title}</div>
        <div className="flex items-center gap-3">
          <span>● {answeredCount}/{totalQuestions}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar */}
        <nav className="flex w-12 flex-col items-center gap-1 border-r border-border bg-[oklch(0.13_0.02_270)] py-3">
          <ActivityIcon active={explorerOpen} onClick={() => setExplorerOpen((o) => !o)} label="Explorer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
          </ActivityIcon>
          <ActivityIcon label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>
          </ActivityIcon>
          <ActivityIcon label="Run">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M8 5v14l11-7z" /></svg>
          </ActivityIcon>
          <div className="mt-auto">
            <ActivityIcon label="Account">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>
            </ActivityIcon>
          </div>
        </nav>

        {/* Sidebar / Explorer */}
        {explorerOpen && (
          <aside className="flex w-64 flex-col border-r border-border bg-[oklch(0.18_0.02_270)]">
            <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Explorer
            </div>
            <div className="px-3 pb-2 font-mono text-[11px] font-bold text-foreground">
              ▾ LAB-WORKSPACE
            </div>
            <div className="flex-1 overflow-y-auto px-1 pb-4 font-mono text-[12px]">
              {lab.parts.map((part, pi) => {
                const locked = pi > partIndex;
                const done = pi < partIndex;
                const active = pi === partIndex;
                return (
                  <div key={part.part} className="mb-1">
                    <button
                      onClick={() => !locked && setPartIndex(pi)}
                      disabled={locked}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors ${
                        active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/30"
                      } ${locked ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <span className="text-[10px]">{active ? "▾" : "▸"}</span>
                      <span>{done ? "✓" : locked ? "🔒" : "📁"}</span>
                      <span className="truncate">part-{part.part}/</span>
                    </button>
                    {active && (
                      <div className="ml-5 border-l border-border/60 pl-2">
                        {part.questions.map((q) => {
                          const fb = feedbacks[q.id];
                          const isDone = isQuestionDone(q.id);
                          const hasError = fb?.verdict === "wrong" || fb?.verdict === "verification_failed";
                          const isPending = fb?.verdict === "suspicious";
                          return (
                            <a
                              key={q.id}
                              href={`#q-${q.id}`}
                              className="flex items-center gap-1.5 rounded px-2 py-0.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                            >
                              <span className={
                                isDone ? "text-success" :
                                hasError ? "text-destructive" :
                                isPending ? "text-primary" :
                                "text-accent"
                              }>
                                {isDone ? "●" : hasError ? "✗" : isPending ? "?" : "○"}
                              </span>
                              <span className="truncate">{q.id}.java</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Editor area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs strip */}
          <div className="flex items-center border-b border-border bg-[oklch(0.13_0.02_270)] font-mono text-[11px]">
            {lab.parts.map((p, pi) => {
              const locked = pi > partIndex;
              const active = pi === partIndex;
              return (
                <button
                  key={p.part}
                  onClick={() => !locked && setPartIndex(pi)}
                  disabled={locked}
                  className={`flex items-center gap-2 border-r border-border px-3 py-2 transition-colors ${
                    active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/20"
                  } ${locked ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="text-accent">📁</span>
                  part-{p.part}.lab
                  {active && <span className="size-1.5 rounded-full bg-accent" />}
                </button>
              );
            })}
            <div className="ml-auto px-3 py-2 text-muted-foreground">
              {partIndex + 1}/{lab.parts.length}
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 border-b border-border/60 bg-background/60 px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
            <span>lab-workspace</span><span>›</span>
            <span>part-{currentPart.part}</span><span>›</span>
            <span className="text-foreground">{currentPart.title}</span>
          </div>

          {/* Scroll area */}
          <div className="flex-1 overflow-y-auto bg-background">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPart.part}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mx-auto max-w-4xl px-4 py-6 md:px-8"
              >
                <div className="mb-6 border-l-2 border-primary pl-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    // part {currentPart.part} of {lab.parts.length}
                  </div>
                  <h1 className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {currentPart.title}
                  </h1>
                  <p className="mt-1 font-mono text-[12px] text-muted-foreground">
                    {currentPart.questions.length} task{currentPart.questions.length === 1 ? "" : "s"} ·{" "}
                    {isLastPart ? "final part" : "complete to unlock next"}
                  </p>
                </div>

                <div className="space-y-5 pb-6">
                  {(() => {
                    // First question that is not yet "done" is "active"
                    const firstNotDoneIdx = currentPart.questions.findIndex((q) => !isQuestionDone(q.id));

                    return currentPart.questions.map((q, i) => {
                      const isDone = isQuestionDone(q.id);
                      const isActive = i === firstNotDoneIdx;
                      const state: "active" | "done" | "locked" = isDone
                        ? "done"
                        : isActive
                          ? "active"
                          : "locked";

                      const startedAt = questionStartedAtRef.current[q.id];
                      const elapsedSeconds =
                        state === "active" && startedAt
                          ? (nowTick - startedAt) / 1000
                          : undefined;

                      return (
                        <div key={q.id}>
                          <QuestionCard
                            question={q}
                            index={i}
                            value={answers[q.id] ?? ""}
                            onChange={(v) => updateAnswer(q.id, v)}
                            state={state}
                            isLast={i === currentPart.questions.length - 1}
                            onExecute={() => executeQuestion(q.id)}
                            elapsedSeconds={elapsedSeconds}
                          />
                          {/* Inline feedback below the card */}
                          {feedbacks[q.id] && (
                            <AgentBFeedback state={feedbacks[q.id]} />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Status / action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[oklch(0.22_0.05_270)] px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${partComplete ? "bg-success" : "bg-accent"} animate-pulse`} />
                {partComplete ? "ready" : "waiting"}
              </span>
              <span>$ part-{currentPart.part}</span>
              <span className="text-foreground">
                {currentPart.questions.filter((q) => isQuestionDone(q.id)).length}/{currentPart.questions.length} done
              </span>
              {!partComplete && (
                <span className="hidden text-accent sm:inline">// submit each question to continue</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {submitError && (
                <span className="max-w-[220px] truncate text-destructive" title={submitError}>
                  ⚠ {submitError}
                </span>
              )}
              {isLastPart ? (
                <button
                  onClick={() => void handleSubmit()}
                  disabled={!partComplete || submittingLab}
                  className="rounded bg-success px-4 py-1.5 font-bold text-success-foreground transition-all enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submittingLab ? "… submitting" : "▶ submit lab"}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={!partComplete}
                  className="rounded bg-accent px-4 py-1.5 font-bold text-accent-foreground transition-all enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  next part →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Instructor chat */}
      <InstructorChat />

      {/* Verification modal */}
      <VerificationModal
        open={verificationModal.open}
        question={verificationModal.verificationQuestion}
        onSubmit={handleVerificationSubmit}
        onClose={handleVerificationClose}
      />
    </div>
  );
}

function ActivityIcon({
  children, active, onClick, label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex size-9 items-center justify-center rounded transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && <span className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" />}
      {children}
    </button>
  );
}

function SubmittedView({
  title,
  evaluation,
  onRestart,
}: {
  title: string;
  evaluation: { grade: number; feedback: string; improvement_suggestions?: string[] } | null;
  onRestart: () => void;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const feedbackText = evaluation?.feedback?.trim() ?? "";
  const suggestions =
    evaluation?.improvement_suggestions?.map((s) => s.trim()).filter(Boolean) ?? [];
  const hasFeedback = feedbackText.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const gradeLabel =
    evaluation != null && typeof evaluation.grade === "number" && !Number.isNaN(evaluation.grade)
      ? String(evaluation.grade)
      : "—";

  const dialogShell =
    "max-h-[min(85vh,640px)] gap-0 border-border bg-[oklch(0.14_0.02_270)] p-0 shadow-[0_24px_80px_-12px_oklch(0_0_0/0.55)] sm:max-w-lg";

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.45_0.2_280/0.25),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,oklch(0.55_0.15_160/0.12),transparent)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-border/80 bg-card/40 p-px shadow-2xl backdrop-blur-xl">
          <div className="rounded-[calc(1rem-1px)] bg-[oklch(0.12_0.02_270/0.92)] px-4 py-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-[0_0_40px_-8px_oklch(0.65_0.2_280/0.6)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="size-7 text-background"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">
              Lab submitted
            </p>
            <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground md:text-[1.65rem]">
              You&apos;re all set
            </h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              <span className="text-foreground/90">{title}</span> has been sent for review.
            </p>

            <div className="mt-8 rounded-xl border border-border/60 bg-background/40 px-5 py-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Grade / 20
              </div>
              <div className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight text-primary">
                {gradeLabel}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={!hasFeedback}
                onClick={() => setFeedbackOpen(true)}
                className="h-11 border-primary/25 bg-primary/5 font-mono text-[12px] font-semibold hover:bg-primary/10"
              >
                <MessageSquare className="size-4 text-primary" />
                View feedback
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!hasSuggestions}
                onClick={() => setSuggestionsOpen(true)}
                className="h-11 border-accent/30 bg-accent/5 font-mono text-[12px] font-semibold hover:bg-accent/10"
              >
                <Sparkles className="size-4 text-accent" />
                Improvement suggestions
              </Button>
            </div>

            {!evaluation && (
              <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
                Connect the API and submit with a session to see AI feedback here.
              </p>
            )}

            <Button
              type="button"
              onClick={onRestart}
              className="mt-8 h-11 w-full bg-accent font-mono text-sm font-bold text-accent-foreground shadow-[0_0_0_1px_oklch(0.7_0.18_280/0.25)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Upload another lab
            </Button>
          </div>
        </div>
      </motion.div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className={dialogShell}>
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <DialogTitle className="font-mono text-lg">Feedback</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(55vh,420px)] overflow-y-auto px-6 py-5">
            <p className="whitespace-pre-wrap text-left text-sm leading-relaxed text-muted-foreground">
              {hasFeedback ? feedbackText : "No feedback was returned for this submission."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <DialogContent className={dialogShell}>
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <DialogTitle className="font-mono text-lg">Improvement suggestions</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(55vh,420px)] overflow-y-auto px-6 py-5">
            {hasSuggestions ? (
              <ul className="space-y-3 text-left text-sm leading-relaxed text-muted-foreground">
                {suggestions.map((s, i) => (
                  <li key={`${i}-${s.slice(0, 48)}`} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-left text-sm text-muted-foreground">
                No improvement suggestions were returned for this submission.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}