/* eslint-disable prettier/prettier */
import { useMemo } from "react";
import { InlineCodeEditor } from "./InlineCodeEditor";
import { HighlightedLine } from "@/lib/syntax";
import type { Question } from "@/lib/lab-data";

type Props = {
  question: Question;
  index: number;
  value: string;
  onChange: (v: string) => void;
  state?: "active" | "locked" | "done";
  onExecute?: () => void;
  isLast?: boolean;
  /** Seconds since this question became active (shown when state === "active"). */
  elapsedSeconds?: number;
};

function formatElapsed(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `0:${r.toString().padStart(2, "0")}`;
}

export function QuestionCard({
  question,
  index,
  value,
  onChange,
  state = "active",
  onExecute,
  isLast,
  elapsedSeconds,
}: Props) {
  const isCompletion = question.type === "completion";
  const isLocked = state === "locked";
  const isDone = state === "done";
  const dimmed = isLocked || isDone;

  return (
    <section
      id={`q-${question.id}`}
      className={`relative overflow-hidden rounded-lg border bg-card/40 backdrop-blur transition-all ${
        state === "active"
          ? "border-primary/60 shadow-[0_0_0_1px_oklch(0.7_0.18_280/0.3)]"
          : "border-border"
      }`}
    >
      {dimmed && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-3 ${
            isDone
              ? "backdrop-blur-[3px] bg-background/55"
              : "backdrop-blur-md bg-background/70"
          }`}
        >
          <span className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
            isDone ? "bg-success/20 text-success" : "bg-muted/40 text-muted-foreground"
          }`}>
            {isDone ? "✓ done" : "🔒 locked"}
          </span>
        </div>
      )}
      <fieldset disabled={dimmed} className={dimmed ? "select-none" : ""}>
      {/* Question header — like a code section comment */}
      <header className={`border-b border-border bg-background/60 px-5 py-3 ${isLocked ? "opacity-55 blur-[1px]" : ""}`}>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary">
            Q{index + 1}
          </span>
          <span className="text-muted-foreground/70">@question</span>
          <span className="min-w-0 truncate text-foreground">{question.id}</span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {state === "active" && elapsedSeconds !== undefined && (
              <span
                className="flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] tabular-nums text-primary"
                title="Time on this question"
              >
                <span aria-hidden>⏱</span>
                {formatElapsed(elapsedSeconds)}
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                isCompletion
                  ? "bg-accent/15 text-accent"
                  : "bg-secondary/15 text-secondary"
              }`}
            >
              {question.type}
            </span>
          </div>
        </div>
        <p className={`mt-2 font-mono text-[13px] leading-relaxed text-foreground ${isLocked ? "opacity-70" : ""}`}>
          <span className="text-muted-foreground/60">/** </span>
          {question.task}
          <span className="text-muted-foreground/60"> */</span>
        </p>
      </header>

      <div className="p-4 md:p-5">
        {isCompletion && question.code ? (
          <InlineCodeEditor
            code={question.code}
            value={value}
            onChange={onChange}
            fileName={`${question.id.replace(".", "_")}.code`}
          />
        ) : (
          <CodeEditor
            value={value}
            onChange={onChange}
            fileName={`${question.id.replace(".", "_")}.code`}
            referenceCode={question.code}
          />
        )}
      </div>
      {state === "active" && onExecute && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-[oklch(0.16_0.03_270)] px-4 py-2 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${value.trim() ? "bg-success animate-pulse" : "bg-accent"}`} />
              {value.trim() ? "ready to run" : "awaiting input"}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              Shift+Enter
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => value.trim() && onExecute()}
            disabled={!value.trim()}
            className="group flex items-center gap-1.5 rounded bg-success px-3 py-1 text-[11px] font-bold text-success-foreground shadow-[0_0_0_1px_oklch(0.7_0.18_150/0.4)] transition-all enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3"><path d="M8 5v14l11-7z" /></svg>
            {isLast ? "execute & finish" : "execute ▸ next"}
          </button>
        </div>
      )}
      </fieldset>
    </section>
  );
}

function CodeEditor({
  value,
  onChange,
  fileName,
  referenceCode,
}: {
  value: string;
  onChange: (v: string) => void;
  fileName: string;
  referenceCode?: string;
}) {
  const lineCount = Math.max(value.split("\n").length, 10);
  const refLines = useMemo(() => referenceCode?.split("\n") ?? [], [referenceCode]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code-bg shadow-card">
      <div className="flex items-center border-b border-border bg-background/80">
        {referenceCode && (
          <div className="flex items-center gap-2 border-r border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <span>📄</span>reference.code
          </div>
        )}
        <div className="flex items-center gap-2 border-r border-border bg-code-bg px-3 py-2 font-mono text-[11px] text-foreground">
          <span className="text-secondary">✎</span>{fileName}
          <span className="ml-1 size-1.5 rounded-full bg-accent" />
        </div>
        <div className="ml-auto flex items-center gap-3 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>UTF-8</span><span>LF</span><span>code</span>
        </div>
      </div>

      {referenceCode && (
        <div className="border-b border-border/60 bg-background/30">
          <div className="flex">
            <div
              aria-hidden
              className="select-none border-r border-border/60 bg-background/30 px-3 py-2 text-right font-mono text-[12px] leading-6 text-muted-foreground/40"
            >
              {refLines.map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <pre className="flex-1 overflow-x-auto p-2 font-mono text-[12px] leading-6 opacity-80">
              <code>
                {refLines.map((ln, i) => (
                  <div key={i} className="whitespace-pre">
                    {ln.length === 0 ? "\u200B" : <HighlightedLine line={ln} />}
                  </div>
                ))}
              </code>
            </pre>
          </div>
          <div className="border-t border-border/60 px-4 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            ↑ reference · read only
          </div>
        </div>
      )}

      <div className="flex">
        <div
          aria-hidden
          className="select-none border-r border-border/60 bg-background/30 px-3 py-3 text-right font-mono text-[12px] leading-7 text-muted-foreground/50"
        >
          {Array.from({ length: lineCount }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          spellCheck={false}
          placeholder="// implement your solution here..."
          className="min-h-[14rem] w-full resize-y bg-transparent px-3 py-3 font-mono text-[13px] leading-7 text-code-fg placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between border-t border-border bg-[oklch(0.22_0.05_270)] px-3 py-1 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-secondary" />editing</span>
          <span>Ln {value.split("\n").length}, Col {value.split("\n").pop()?.length ?? 0}</span>
        </span>
        <span>{value.length} chars</span>
      </div>
    </div>
  );
}
