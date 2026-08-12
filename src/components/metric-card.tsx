import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  spark?: number[];
  positive?: boolean;
  hint?: string;
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, spark, positive, hint, className }: MetricCardProps) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums">{value}</span>
      </div>
      {spark ? <Sparkline data={spark} positive={positive} height={32} /> : null}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Card>
  );
}
