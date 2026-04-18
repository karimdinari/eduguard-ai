import { useEffect, useMemo, useRef } from "react";
import { HighlightedLine, highlightWithBlanks } from "@/lib/syntax";

type Props = {
  code: string;
  value: string;
  onChange: (v: string) => void;
  fileName?: string;
};

const SEP = "\u0001";
const BLANK_RE = /_{3,}/g;

export function InlineCodeEditor({ code, value, onChange, fileName = "Student.java" }: Props) {
  const lines = useMemo(() => code.split("\n"), [code]);

  // Pre-compute global blank index per line
  const blankCount = useMemo(() => (code.match(BLANK_RE) ?? []).length, [code]);

  const blanks = useMemo(() => {
    const arr = value ? value.split(SEP) : [];
    while (arr.length < blankCount) arr.push("");
    return arr.slice(0, blankCount);
  }, [value, blankCount]);

  const setBlank = (idx: number, v: string) => {
    const next = [...blanks];
    next[idx] = v;
    onChange(next.join(SEP));
  };

  // Compute starting blank index for each line
  const lineBlankStart = useMemo(() => {
    const starts: number[] = [];
    let acc = 0;
    for (const ln of lines) {
      starts.push(acc);
      acc += (ln.match(BLANK_RE) ?? []).length;
    }
    return starts;
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code-bg shadow-card">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-background/80">
        <div className="flex items-center gap-2 border-r border-border bg-code-bg px-3 py-2 font-mono text-[11px] text-foreground">
          <span className="text-[oklch(0.82_0.18_90)]">☕</span>
          {fileName}
          <span className="ml-1 size-1.5 rounded-full bg-accent" />
        </div>
        <div className="ml-auto flex items-center gap-3 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>UTF-8</span>
          <span>LF</span>
          <span>code</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 border-b border-border/60 bg-background/40 px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
        <span>src</span><span>›</span><span>main</span><span>›</span><span>code</span>
        <span>›</span><span className="text-foreground">{fileName}</span>
      </div>

      {/* Editor */}
      <div className="flex">
        <div
          aria-hidden
          className="select-none border-r border-border/60 bg-background/30 px-3 py-3 text-right font-mono text-[12px] leading-7 text-muted-foreground/50"
        >
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 overflow-x-auto p-3 font-mono text-[13px] leading-7">
          <code>
            {lines.map((ln, lineIdx) => (
              <div key={lineIdx} className="whitespace-pre">
                {ln.length === 0 ? <span>{"\u200B"}</span> : (
                  highlightWithBlanks(ln, /_{3,}/g, (_match, localIdx) => {
                    const idx = lineBlankStart[lineIdx] + localIdx;
                    return (
                      <BlankInput
                        value={blanks[idx] ?? ""}
                        onChange={(v) => setBlank(idx, v)}
                      />
                    );
                  })
                )}
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border bg-[oklch(0.22_0.05_270)] px-3 py-1 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-success" />ready</span>
          <span>Ln {lines.length}</span>
        </span>
        <span>{blanks.filter((b) => b.trim()).length}/{blankCount} blanks filled</span>
      </div>
    </div>
  );
}

function BlankInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      const len = Math.max(value.length, 5);
      ref.current.style.width = `${len + 1}ch`;
    }
  }, [value]);

  const block = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const filled = value.trim().length > 0;
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onCopy={block}
      onCut={block}
      onPaste={block}
      onDrop={block}
      onDragStart={block}
      onDragOver={block}
      onContextMenu={block}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      placeholder="…"
      className={`mx-0.5 inline-block min-w-[5ch] rounded-sm border-b-2 px-1 py-0 align-baseline font-mono text-[13px] outline-none transition-colors ${
        filled
          ? "border-success bg-success/10 text-[oklch(0.85_0.18_150)]"
          : "border-accent/60 bg-accent/10 text-accent placeholder:text-accent/40"
      } focus:border-primary focus:bg-primary/20 focus:shadow-[0_0_0_2px] focus:shadow-primary/30`}
    />
  );
}
