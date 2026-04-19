/* eslint-disable prettier/prettier */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { labStore } from "@/lib/lab-store";
import type { Lab, LabPart, Question } from "@/lib/lab-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "eduGuard-AI — Upload your lab PDF" },
      {
        name: "description",
        content:
          "Turn lab PDFs into interactive, AI-graded coding exercises. Upload, work through structured parts, submit.",
      },
      { property: "og:title", content: "eduGuard-AI — Interactive coding labs from PDFs" },
      {
        property: "og:description",
        content: "Upload a lab PDF and let students solve it part by part with AI grading.",
      },
    ],
  }),
  component: UploadPage,
});

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Convert the backend tp_data shape into the frontend Lab type */
function tpDataToLab(tpData: {
  title: string;
  parts: Array<{
    part: number;
    title: string;
    questions: Array<{
      id: string;
      type: string;
      task: string;
      code?: string;
    }>;
  }>;
}): Lab {
  return {
    title: tpData.title,
    parts: tpData.parts.map((p): LabPart => ({
      part: p.part,
      title: p.title,
      questions: p.questions.map((q): Question => ({
        id: q.id,
        type: q.type as "code" | "completion",
        task: q.task,
        code: q.code,
      })),
    })),
  };
}

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
  };

  const uploadToBackend = async (f: File): Promise<void> => {
    setUploadProgress("Uploading PDF…");

    const formData = new FormData();
    formData.append("file", f);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(detail.detail ?? "Upload failed");
    }

    setUploadProgress("Analysing lab content…");
    const data = await res.json();

    // Store session
    labStore.setSessionId(data.session_id);
    labStore.setInitialMessages(data.messages ?? []);

    // Convert and store lab
    const lab = tpDataToLab(data.tp_data);
    labStore.setLab(lab);
  };

  const start = async () => {
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await uploadToBackend(file);
      navigate({ to: "/lab" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-brand shadow-glow" />
          <span className="font-mono font-bold tracking-tight">eduGuard-AI</span>
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
                {file ? file.name : "Drop your PDF here or click to browse"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to forge`
                  : "PDF · max 10MB"}
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

          {/* Error state */}
          {error && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-[12px] text-destructive">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={start}
            disabled={loading || !file}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-bold text-accent-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                {uploadProgress ?? "Forging your lab…"}
              </>
            ) : (
              <>
                Upload & start the lab
                <span aria-hidden>→</span>
              </>
            )}
          </button>

          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            {file
              ? "// your PDF will be parsed by AI and turned into an interactive lab"
              : "// choose a PDF to continue — max 10MB"}
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