import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "instructor" | "student"; text: string; ts: string };

const CANNED_HINTS = [
  "Think about which annotation marks a class as a JPA entity. It starts with `@E...`.",
  "For the primary key, you need two annotations: one to mark it as the ID, and one to auto-generate it.",
  "Remember: `@GeneratedValue(strategy = GenerationType.IDENTITY)` is the most common choice for auto-increment.",
  "Field-level validation lives in `jakarta.validation.constraints.*` — `@NotBlank`, `@Email`, `@Size`, etc.",
  "A repository extending `JpaRepository<Student, Long>` gives you CRUD methods for free.",
  "Use `Optional<Student>` as the return type for `findById` to handle the missing case cleanly.",
  "Throwing a custom `RuntimeException` from the service layer keeps your controller thin.",
];

const QUICK_PROMPTS = [
  "I'm stuck 😕",
  "Give me a hint",
  "Explain this concept",
  "Am I on the right track?",
];

const SUGGESTED_REPLIES: Record<string, string> = {
  "I'm stuck 😕":
    "No worries — break the problem into the smallest possible step. What's the very next line you think you need to write? Describe it in plain English first.",
  "Give me a hint":
    "Look carefully at the imports already provided at the top of the file — they hint at which classes you're expected to use.",
  "Explain this concept":
    "JPA entities map Java classes to database tables. Each field becomes a column, and each instance becomes a row. The annotations tell Hibernate how to do that mapping.",
  "Am I on the right track?":
    "Your structure looks reasonable. Double-check that every required annotation is in place and that your types match what the repository expects.",
};

function timestamp() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function InstructorChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "instructor",
      text: "Hey 👋 I'm your lab instructor. Ask me for hints anytime — I won't give you the answer, but I'll nudge you in the right direction.",
      ts: timestamp(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const studentMsg: Msg = { role: "student", text: text.trim(), ts: timestamp() };
    setMessages((m) => [...m, studentMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply =
        SUGGESTED_REPLIES[text.trim()] ??
        CANNED_HINTS[hintIdx % CANNED_HINTS.length];
      setHintIdx((i) => i + 1);
      setMessages((m) => [...m, { role: "instructor", text: reply, ts: timestamp() }]);
      setTyping(false);
    }, 700 + Math.random() * 600);
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-brand shadow-glow"
        title="Instructor chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="size-6 text-background"
            >
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            </motion.svg>
          ) : (
            <motion.svg
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="size-6 text-background"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.05-3.5A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-success ring-2 ring-background" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-5 z-50 flex h-[min(560px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-[oklch(0.18_0.02_270)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-[oklch(0.13_0.02_270)] px-4 py-3">
              <div className="relative">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-brand font-mono text-sm font-bold text-background">
                  AI
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-[oklch(0.13_0.02_270)]" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-bold text-foreground">Instructor</div>
                <div className="font-mono text-[10px] text-success">● online · ready to help</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                title="Minimize"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" d="M5 12h14" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[oklch(0.16_0.02_270)] px-3 py-4">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${m.role === "student" ? "flex-row-reverse" : ""}`}
                >
                  {m.role === "instructor" && (
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand font-mono text-[10px] font-bold text-background">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[78%] ${m.role === "student" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    <div
                      className={`rounded-lg px-3 py-2 font-mono text-[12px] leading-relaxed ${
                        m.role === "instructor"
                          ? "rounded-tl-sm bg-[oklch(0.22_0.03_270)] text-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="px-1 font-mono text-[9px] text-muted-foreground">{m.ts}</span>
                  </div>
                </motion.div>
              ))}

              {typing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand font-mono text-[10px] font-bold text-background">
                    AI
                  </div>
                  <div className="flex items-center gap-1 rounded-lg rounded-tl-sm bg-[oklch(0.22_0.03_270)] px-3 py-2.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        className="size-1.5 rounded-full bg-muted-foreground"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 border-t border-border bg-[oklch(0.18_0.02_270)] px-3 py-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={typing}
                  className="rounded-full border border-border bg-[oklch(0.22_0.03_270)] px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-border bg-[oklch(0.13_0.02_270)] px-3 py-2.5"
            >
              <span className="font-mono text-[11px] text-success">$</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ask the instructor..."
                className="flex-1 bg-transparent font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="rounded bg-accent px-2.5 py-1 font-mono text-[10px] font-bold text-accent-foreground transition-all enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                send ↵
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
