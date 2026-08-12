import {
  TrendingUp,
  TrendingDown,
  Gauge,
  Sparkles,
  PackagePlus,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Severity, SignalType } from "@/lib/types";

const ICONS: Record<SignalType, LucideIcon> = {
  revenue_acceleration: TrendingUp,
  profit_acceleration: TrendingUp,
  margin_expansion: Gauge,
  earnings_surprise: Sparkles,
  large_order: PackagePlus,
  institutional_buying: Landmark,
  institutional_selling: Landmark,
  score_up: ArrowUpRight,
  score_down: ArrowDownRight,
  debt_reduction: TrendingDown,
  unusual_volume: Activity,
  promoter_buying: UserCheck,
  promoter_selling: UserX,
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  high: "bg-emerald-400/12 text-emerald-400 ring-emerald-400/25",
  medium: "bg-sky-400/12 text-sky-400 ring-sky-400/25",
  low: "bg-muted text-muted-foreground ring-border",
};

const NEGATIVE_TYPES = new Set<SignalType>(["score_down", "institutional_selling", "promoter_selling"]);

interface SignalBadgeProps {
  type: SignalType;
  label: string;
  severity: Severity;
  className?: string;
}

export function SignalBadge({ type, label, severity, className }: SignalBadgeProps) {
  const Icon = ICONS[type] ?? Activity;
  const negative = NEGATIVE_TYPES.has(type);
  const classes = negative ? "bg-rose-400/12 text-rose-400 ring-rose-400/25" : SEVERITY_CLASSES[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", classes, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        severity === "high" && "bg-emerald-400",
        severity === "medium" && "bg-sky-400",
        severity === "low" && "bg-muted-foreground"
      )}
    />
  );
}
