import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectorSummary } from "@/lib/types";
import { changeColorClass, formatPct } from "@/lib/format";
import { ScoreBadge } from "@/components/score-badge";
import { cn } from "@/lib/utils";

export function SectorCard({ sector }: { sector: SectorSummary }) {
  return (
    <Link href={`/universe?sector=${encodeURIComponent(sector.sector)}`}>
      <Card className="gap-3 p-4 transition-colors hover:border-primary/40">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium">{sector.sector}</h3>
            <span className="text-xs text-muted-foreground">{sector.companyCount} companies</span>
          </div>
          <ScoreBadge score={sector.emergingScore} label="avg" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Stat label="1M change" value={formatPct(sector.avgChange1m)} className={changeColorClass(sector.avgChange1m)} />
          <Stat label="Avg PE" value={`${sector.avgPe}x`} />
          <Stat label="Revenue growth" value={formatPct(sector.avgRevenueGrowth)} className={changeColorClass(sector.avgRevenueGrowth)} />
          <Stat label="Profit growth" value={formatPct(sector.avgProfitGrowth)} className={changeColorClass(sector.avgProfitGrowth)} />
          <Stat label="Avg margin" value={`${sector.avgMargin}%`} />
          <Stat
            label="Margin change"
            value={`${sector.avgMarginChange > 0 ? "+" : ""}${sector.avgMarginChange}pp`}
            className={changeColorClass(sector.avgMarginChange)}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="text-emerald-400">{sector.accelerating} accelerating</span>
          <span className="text-rose-400">{sector.decelerating} decelerating</span>
          <span>{sector.positiveSurprises} beats</span>
        </div>
      </Card>
    </Link>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", className)}>{value}</span>
    </div>
  );
}
