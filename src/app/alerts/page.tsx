"use client";

import { useMemo, useState } from "react";
import { AlertCard } from "@/components/alert-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { alerts } from "@/lib/mock-data";
import { SignalType } from "@/lib/types";

const TYPE_LABELS: Record<SignalType, string> = {
  revenue_acceleration: "Revenue acceleration",
  profit_acceleration: "Profit acceleration",
  margin_expansion: "Margin expansion",
  earnings_surprise: "Earnings surprise",
  large_order: "Large order",
  institutional_buying: "Institutional buying",
  institutional_selling: "Institutional selling",
  score_up: "Score up",
  score_down: "Score down",
  debt_reduction: "Debt reduction",
  unusual_volume: "Unusual volume",
  promoter_buying: "Promoter buying",
  promoter_selling: "Promoter selling",
};

export default function AlertsPage() {
  const [type, setType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");

  const filtered = useMemo(
    () => alerts.filter((a) => (type === "all" || a.type === type) && (severity === "all" || a.severity === severity)),
    [type, severity]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} alerts matching your filters.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={severity} onValueChange={(v) => setSeverity(v ?? "all")}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => setType(v ?? "all")}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue placeholder="Alert type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alert types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.slice(0, 100).map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>
    </div>
  );
}
