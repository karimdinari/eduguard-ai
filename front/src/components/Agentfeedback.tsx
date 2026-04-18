/* eslint-disable prettier/prettier */
import { motion, AnimatePresence } from "framer-motion";

export type Verdict = "accepted" | "wrong" | "suspicious" | "verification_passed" | "verification_failed" | null;

export type FeedbackState =
  | { verdict: null }
  | { verdict: "submitting" }
  | { verdict: "accepted"; message: string }
  | { verdict: "wrong"; message: string; hint?: string }
  | { verdict: "suspicious"; message: string; verificationQuestion: string }
  | { verdict: "verification_passed"; message: string }
  | { verdict: "verification_failed"; message: string; explanation?: string };

type Props = {
  state: FeedbackState;
};

const CONFIGS = {
  submitting: {
    border: "border-border/60",
    bg: "bg-[oklch(0.18_0.02_270)]",
    icon: null,
    label: null,
    labelColor: "",
  },
  accepted: {
    border: "border-success/40",
    bg: "bg-success/8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 text-success">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    label: "accepted",
    labelColor: "text-success",
  },
  wrong: {
    border: "border-destructive/40",
    bg: "bg-destructive/8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 text-destructive">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    label: "wrong answer",
    labelColor: "text-destructive",
  },
  suspicious: {
    border: "border-primary/40",
    bg: "bg-primary/8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    label: "verification required",
    labelColor: "text-primary",
  },
  verification_passed: {
    border: "border-success/40",
    bg: "bg-success/8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 text-success">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "verified & accepted",
    labelColor: "text-success",
  },
  verification_failed: {
    border: "border-accent/40",
    bg: "bg-accent/8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    label: "explanation provided",
    labelColor: "text-accent",
  },
} as const;

export function AgentBFeedback({ state }: Props) {
  if (state.verdict === null) return null;

  if (state.verdict === "submitting") {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.18_0.02_270)] px-4 py-3"
      >
        <div className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
          <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          Evaluating your answer…
        </div>
      </motion.div>
    );
  }

  const cfg = CONFIGS[state.verdict];

  return (
    <AnimatePresence>
      <motion.div
        key={state.verdict}
        initial={{ opacity: 0, y: 6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mt-3 overflow-hidden"
      >
        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            {cfg.icon && (
              <div className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${cfg.border}`}>
                {cfg.icon}
              </div>
            )}
            <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${cfg.labelColor}`}>
              {cfg.label}
            </span>
          </div>

          {/* Message */}
          <p className="font-mono text-[12px] leading-relaxed text-foreground/90">
            {cleanMessage(state.message)}
          </p>

          {/* Hint (wrong) */}
          {"hint" in state && state.hint && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                💡 hint
              </span>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-foreground/80">
                {state.hint.replace(/^💡\s*\*\*Hint:\*\*\s*/, "")}
              </p>
            </div>
          )}

          {/* Explanation (verification_failed) */}
          {"explanation" in state && state.explanation && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                📖 explanation
              </span>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {state.explanation.replace(/^📖\s*\*\*Explanation:\*\*\n?/, "")}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function cleanMessage(msg: string): string {
  return msg
    // eslint-disable-next-line no-misleading-character-class
    .replace(/^[✅❌🔍📖]\s*/, "")
    .replace(/\n\n🤔 \*\*Question:\*\*.*$/s, "")
    .replace(/\n\n💡 \*\*Hint:\*\*.*$/s, "")
    .replace(/\n\n📖 \*\*Explanation:\*\*[\s\S]*$/s, "")
    .trim();
}