import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { labStore } from "@/lib/lab-store";
import { sampleLab } from "@/lib/lab-data";
import { QuestionCard } from "@/components/QuestionCard";
import { InstructorChat } from "@/components/InstructorChat";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Lab Workspace — LabForge" },
      { name: "description", content: "Work through your lab part by part." },
    ],
  }),
  component: LabPage,
});

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
  const [explorerOpen, setExplorerOpen] = useState(true);

  const currentPart = lab.parts[partIndex];
  const isLastPart = partIndex === lab.parts.length - 1;

  const partComplete = currentPart.questions.every((q) => executed[q.id]);

  const updateAnswer = (id: string, v: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: v };
      labStore.setAnswer(id, v);
      return next;
    });
  };

  const executeQuestion = (id: string) => {
    setExecuted((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const el = document.getElementById(`q-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const goNext = () => {
    if (!partComplete) return;
    setPartIndex((i) => Math.min(i + 1, lab.parts.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = () => {
    if (!partComplete) return;
    setSubmitted(true);
  };

  if (submitted) {
    return <SubmittedView title={lab.title} onRestart={() => navigate({ to: "/" })} />;
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
                          const filled = (answers[q.id] ?? "").trim().length > 0;
                          return (
                            <a
                              key={q.id}
                              href={`#q-${q.id}`}
                              className="flex items-center gap-1.5 rounded px-2 py-0.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                            >
                              <span className={filled ? "text-success" : "text-accent"}>
                                {filled ? "●" : "○"}
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
                    active
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-muted/20"
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
                    const firstNotExecutedIdx = currentPart.questions.findIndex(
                      (q) => !executed[q.id]
                    );
                    const activeIdx =
                      firstNotExecutedIdx === -1 ? -1 : firstNotExecutedIdx;
                    return currentPart.questions.map((q, i) => {
                      const isActive = i === activeIdx;
                      const isDone = executed[q.id];
                      const state: "active" | "done" | "locked" = isActive
                        ? "active"
                        : isDone
                          ? "done"
                          : "locked";
                      return (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          index={i}
                          value={answers[q.id] ?? ""}
                          onChange={(v) => updateAnswer(q.id, v)}
                          state={state}
                          isLast={i === currentPart.questions.length - 1}
                          onExecute={() => executeQuestion(q.id)}
                        />
                      );
                    });
                  })()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Terminal-style status / action bar */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-[oklch(0.22_0.05_270)] px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${partComplete ? "bg-success" : "bg-accent"} animate-pulse`} />
                {partComplete ? "ready" : "waiting"}
              </span>
              <span>$ part-{currentPart.part}</span>
              <span className="text-foreground">
                {currentPart.questions.filter((q) => (answers[q.id] ?? "").trim()).length}/{currentPart.questions.length} answered
              </span>
              {!partComplete && (
                <span className="text-accent">// complete all to continue</span>
              )}
            </div>
            {isLastPart ? (
              <button
                onClick={handleSubmit}
                disabled={!partComplete}
                className="rounded bg-success px-4 py-1.5 font-bold text-success-foreground transition-all enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ▶ submit lab
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
        </main>
      </div>
      <InstructorChat />
    </div>
  );
}

function ActivityIcon({
  children,
  active,
  onClick,
  label,
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
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && <span className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" />}
      {children}
    </button>
  );
}

function SubmittedView({ title, onRestart }: { title: string; onRestart: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-lg border border-border bg-card/70 p-8 text-center backdrop-blur md:p-12"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-md bg-gradient-brand shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8 text-background">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 font-mono text-2xl font-bold tracking-tight">$ lab.submit() ✓</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Your answers for <span className="text-foreground">{title}</span> are queued for AI review.
        </p>
        <button
          onClick={onRestart}
          className="mt-8 rounded bg-accent px-6 py-2.5 font-mono font-bold text-accent-foreground transition-transform hover:scale-[1.02]"
        >
          ▶ upload another lab
        </button>
      </motion.div>
    </div>
  );
}
