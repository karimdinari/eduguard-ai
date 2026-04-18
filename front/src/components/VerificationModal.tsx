/* eslint-disable prettier/prettier */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type VerificationState =
  | { status: "pending" }
  | { status: "submitting" }
  | { status: "passed"; message: string }
  | { status: "failed"; message: string; explanation?: string };

type Props = {
  open: boolean;
  question: string;
  onSubmit: (response: string) => Promise<{ verdict: string; message: string; explanation?: string }>;
  onClose: () => void;
};

export function VerificationModal({ open, question, onSubmit, onClose }: Props) {
  const [response, setResponse] = useState("");
  const [state, setState] = useState<VerificationState>({ status: "pending" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setResponse("");
      setState({ status: "pending" });
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  // Trap focus + ESC (only when pending — can't escape mid-verification)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.status !== "submitting") {
        // only allow closing after a final verdict
        if (state.status === "passed" || state.status === "failed") onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, state, onClose]);

  const handleSubmit = async () => {
    if (!response.trim() || state.status === "submitting") return;
    setState({ status: "submitting" });
    try {
      const result = await onSubmit(response.trim());
      if (result.verdict === "verification_passed") {
        setState({ status: "passed", message: result.message });
      } else {
        setState({ status: "failed", message: result.message, explanation: result.explanation });
      }
    } catch {
      setState({ status: "failed", message: "Something went wrong. Please try again." });
    }
  };

  const isDone = state.status === "passed" || state.status === "failed";
  const canType = state.status === "pending";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => isDone && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-[oklch(0.14_0.02_270)] shadow-[0_32px_80px_-16px_oklch(0_0_0/0.8)]">

              {/* Scan-line header */}
              <div className="relative overflow-hidden border-b border-border bg-[oklch(0.11_0.02_270)] px-6 py-4">
                {/* Animated accent line */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                />

                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        verification required
                      </span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                        agent b
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                      Answer this before your submission is accepted
                    </p>
                  </div>
                </div>
              </div>

              {/* Question block */}
              <div className="px-6 pt-5 pb-4">
                <div className="rounded-xl border border-border/60 bg-[oklch(0.18_0.025_270)] p-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    // question
                  </div>
                  <p className="font-mono text-[13px] leading-relaxed text-foreground">
                    {question}
                  </p>
                </div>
              </div>

              {/* Input / result area */}
              <div className="px-6 pb-5">
                <AnimatePresence mode="wait">
                  {!isDone ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        // your explanation
                      </div>
                      <div className={`overflow-hidden rounded-xl border transition-colors ${
                        canType ? "border-border focus-within:border-primary/60" : "border-border/40"
                      } bg-[oklch(0.11_0.015_270)]`}>
                        <textarea
                          ref={textareaRef}
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          disabled={!canType}
                          placeholder="Explain your reasoning in plain terms…"
                          rows={4}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                          }}
                          className="w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
                        />
                        <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          <span>{response.length} chars</span>
                          <kbd className="rounded border border-border bg-background/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                            ⌘↵ submit
                          </kbd>
                        </div>
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={!response.trim() || state.status === "submitting"}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-mono text-[12px] font-bold text-primary-foreground transition-all enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {state.status === "submitting" ? (
                          <>
                            <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                            Evaluating…
                          </>
                        ) : (
                          <>
                            Submit explanation
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {state.status === "passed" ? (
                        <PassedResult message={state.message} onClose={onClose} />
                      ) : (
                        <FailedResult message={state.message} explanation={state.explanation} onClose={onClose} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PassedResult({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 text-success">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-success">
            verification passed
          </div>
          <p className="mt-1 font-mono text-[12px] leading-relaxed text-foreground">
            {message.replace(/^✅\s*/, "")}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-full rounded-xl bg-success px-5 py-2.5 font-mono text-[12px] font-bold text-success-foreground transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Continue →
      </button>
    </div>
  );
}

function FailedResult({
  message,
  explanation,
  onClose,
}: {
  message: string;
  explanation?: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 text-destructive">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-destructive">
            verification failed
          </div>
          <p className="mt-1 font-mono text-[12px] leading-relaxed text-foreground">
            {message.replace(/^📖\s*/, "")}
          </p>
        </div>
      </div>

      {explanation && (
        <div className="rounded-xl border border-border/60 bg-[oklch(0.18_0.025_270)] p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // explanation
          </div>
          <p className="font-mono text-[12px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {explanation.replace(/^📖\s*\*\*Explanation:\*\*\n?/, "")}
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full rounded-xl border border-border bg-background/60 px-5 py-2.5 font-mono text-[12px] font-bold text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
      >
        Got it — close
      </button>
    </div>
  );
}