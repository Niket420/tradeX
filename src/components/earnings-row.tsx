import Link from "next/link";
import { Company } from "@/lib/types";
import { formatCr, formatPct, formatDate, changeColorClass } from "@/lib/format";
import { cn } from "@/lib/utils";

function surpriseBadge(pct: number) {
  if (pct > 5) return <span className="rounded bg-emerald-400/12 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">Beat</span>;
  if (pct < -5) return <span className="rounded bg-rose-400/12 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">Miss</span>;
  return <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">In line</span>;
}

export function EarningsRow({ company, showPriorRunUp }: { company: Company; showPriorRunUp?: boolean }) {
  const e = company.earnings;
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/company/${company.symbol}`} className="flex items-center gap-2 hover:text-primary">
          <span className="text-sm font-medium">{company.name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{company.symbol}</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{e.quarter}</span>
          <span>·</span>
          <span>{formatDate(e.resultDate)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-mono tabular-nums">
            {formatCr(e.actualRevenueCr)} <span className="text-muted-foreground">/ {formatCr(e.expectedRevenueCr)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("font-mono tabular-nums", changeColorClass(e.revenueSurprisePct))}>{formatPct(e.revenueSurprisePct)}</span>
            {surpriseBadge(e.revenueSurprisePct)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Profit</span>
          <span className="font-mono tabular-nums">
            {formatCr(e.actualProfitCr)} <span className="text-muted-foreground">/ {formatCr(e.expectedProfitCr)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("font-mono tabular-nums", changeColorClass(e.profitSurprisePct))}>{formatPct(e.profitSurprisePct)}</span>
            {surpriseBadge(e.profitSurprisePct)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Margin surprise</span>
          <span className={cn("font-mono tabular-nums", changeColorClass(e.marginSurprisePct))}>{formatPct(e.marginSurprisePct)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Stock reaction</span>
          <span className={cn("font-mono tabular-nums", changeColorClass(e.stockReactionPct))}>{formatPct(e.stockReactionPct)}</span>
        </div>
      </div>
      {showPriorRunUp ? (
        <p className="text-[11px] text-muted-foreground">
          Stock had already moved <span className={changeColorClass(e.priorRunUp3mPct)}>{formatPct(e.priorRunUp3mPct)}</span> in the prior 3 months —{" "}
          {Math.abs(e.priorRunUp3mPct) > 20 ? "much of this may already be priced in." : "limited prior run-up."}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">{e.guidance}</p>
      )}
    </div>
  );
}
