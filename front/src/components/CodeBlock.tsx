type Props = {
  code: string;
  label?: string;
};

export function CodeBlock({ code, label }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-accent/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label ?? "snippet.java"}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-code-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
