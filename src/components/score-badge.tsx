import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function tierClasses(score: number): string {
  if (score >= 75) return "bg-emerald-400/12 text-emerald-400 ring-emerald-400/25";
  if (score >= 55) return "bg-sky-400/12 text-sky-400 ring-sky-400/25";
  if (score >= 35) return "bg-amber-400/12 text-amber-400 ring-amber-400/25";
  return "bg-rose-400/12 text-rose-400 ring-rose-400/25";
}

export function ScoreBadge({ score, label, size = "sm", className }: ScoreBadgeProps) {
  const sizeClasses = size === "lg" ? "px-3 py-1.5 text-base" : size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-mono font-medium tabular-nums ring-1 ring-inset",
        tierClasses(score),
        sizeClasses,
        className
      )}
    >
      {Math.round(score)}
      {label ? <span className="font-sans font-normal opacity-70">{label}</span> : null}
    </span>
  );
}
