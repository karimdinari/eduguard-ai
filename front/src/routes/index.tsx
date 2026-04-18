import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { sampleLab } from "@/lib/lab-data";
import { labStore } from "@/lib/lab-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabForge — Upload your lab PDF" },
      {
        name: "description",
        content:
          "Turn lab PDFs into interactive, AI-graded coding exercises. Upload, work through structured parts, submit.",
      },
      { property: "og:title", content: "LabForge — Interactive coding labs from PDFs" },
      {
        property: "og:description",
        content: "Upload a lab PDF and let students solve it part by part with AI grading.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    setFileName(file.name);
  };

  const start = async () => {
    setLoading(true);
    // Simulated transformation delay
    await new Promise((r) => setTimeout(r, 900));
    labStore.setLab(sampleLab);
    navigate({ to: "/lab" });
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-brand shadow-glow" />
          <span className="font-mono font-bold tracking-tight">LabForge</span>
        </div>
        <span className="hidden font-mono text-xs text-muted-foreground sm:block">
          v0.1 · ai-graded
        </span>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <span className="inline-block rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            PDF → Interactive Lab
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Drop a lab PDF.
            <br />
            <span className="text-gradient">Get a coding workspace.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Students walk through your lab part by part. Each question gets a code editor. AI
            grades when they submit.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur md:p-8"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-background/40 hover:border-primary/60"
            }`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="size-7 text-background"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold">
                {fileName ?? "Drop your PDF here or click to browse"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {fileName ? "ready to forge" : "PDF · max 50MB"}
              </p>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <button
            onClick={start}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-bold text-accent-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                Forging your lab…
              </>
            ) : (
              <>
                {fileName ? "Start the lab" : "Try with sample PDF"}
                <span aria-hidden>→</span>
              </>
            )}
          </button>

          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            // demo: any upload loads the sample Spring Boot lab
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { k: "01", t: "Structured parts", d: "Locked progression, one part at a time." },
            { k: "02", t: "Code-first UI", d: "Every question has its own editor." },
            { k: "03", t: "AI grading", d: "Answers reviewed automatically on submit." },
          ].map((f) => (
            <div
              key={f.k}
              className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur"
            >
              <div className="font-mono text-xs text-primary">{f.k}</div>
              <div className="mt-1 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
