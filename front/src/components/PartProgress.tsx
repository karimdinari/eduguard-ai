import type { LabPart } from "@/lib/lab-data";

type Props = {
  parts: LabPart[];
  currentIndex: number;
};

export function PartProgress({ parts, currentIndex }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {parts.map((p, i) => (
          <div
            key={p.part}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentIndex
                ? "bg-success"
                : i === currentIndex
                  ? "bg-gradient-brand"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span>
          PART {currentIndex + 1} / {parts.length}
        </span>
        <span className="text-foreground">{parts[currentIndex]?.title}</span>
      </div>
    </div>
  );
}
