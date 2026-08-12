"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import { Sparkline } from "@/components/sparkline";
import { formatPct, changeColorClass } from "@/lib/format";
import { multibaggerRadar } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function MultibaggerRadarPage() {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = multibaggerRadar.slice(0, visible);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Multibagger Radar</h1>
        <p className="text-sm text-muted-foreground">Early-stage companies showing sustained improvement in business fundamentals.</p>
        <p className="mt-2 inline-block rounded-md border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-400">
          This is a research signal, not a buy recommendation.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Ranked by Multibagger score across the full tracked universe. Showing {shown.length.toLocaleString("en-IN")} of{" "}
        {multibaggerRadar.length.toLocaleString("en-IN")}.
      </p>

      <div className="flex flex-col gap-2.5">
        {shown.map((c, idx) => {
          const h = c.quarterlyHistory;
          const revSeries = h.map((q) => q.revenueGrowthYoY);
          const profitSeries = h.map((q) => q.profitGrowthYoY);
          const marginSeries = h.map((q) => q.ebitdaMargin);
          return (
            <Card key={c.symbol} className="gap-0 overflow-hidden p-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="w-6 shrink-0 text-xs text-muted-foreground">#{idx + 1}</span>
                  <div className="flex min-w-40 flex-1 flex-col">
                    <Link href={`/company/${c.symbol}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-mono">{c.symbol}</span> · {c.sector}
                    </span>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <Sparkline data={revSeries} height={28} />
                  </div>
                  <span className={cn("hidden font-mono text-xs tabular-nums sm:inline", changeColorClass(c.change6m))}>{formatPct(c.change6m)} 6M</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{c.pe}x PE</span>
                  <ScoreBadge score={c.scores.multibagger} label="/ 100" size="md" />
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>

                <div className="flex flex-col gap-4 border-t border-border bg-muted/20 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <TrendBlock title="Revenue growth" series={revSeries} labels={h.map((q) => q.quarter)} suffix="%" />
                    <TrendBlock title="Profit growth" series={profitSeries} labels={h.map((q) => q.quarter)} suffix="%" />
                    <TrendBlock title="EBITDA margin" series={marginSeries} labels={h.map((q) => q.quarter)} suffix="%" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <Stat label="Order book" value={`${c.orderBookGrowthPct > 0 ? "+" : ""}${c.orderBookGrowthPct}%`} className={changeColorClass(c.orderBookGrowthPct)} />
                    <Stat label="Stock price (6M)" value={formatPct(c.change6m)} className={changeColorClass(c.change6m)} />
                    <Stat label="Valuation" value={`${c.pe}x PE`} />
                    <Stat label="Debt/Equity" value={c.debtToEquity.toFixed(2)} />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Potential thesis</span>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">{c.aiThesis}</p>
                  </div>
                </div>
              </details>
            </Card>
          );
        })}
      </div>

      {visible < multibaggerRadar.length ? (
        <Button variant="outline" size="sm" className="mx-auto" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}

function TrendBlock({ title, series, labels, suffix }: { title: string; series: number[]; labels: string[]; suffix: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <div className="mt-1 font-mono text-xs tabular-nums text-foreground/80">
        {series.map((v, i) => (
          <span key={i}>
            {v}
            {suffix}
            {i < series.length - 1 ? <span className="mx-1 text-muted-foreground">→</span> : null}
          </span>
        ))}
      </div>
      <span className="mt-1 block text-[10px] text-muted-foreground">
        {labels[0]} – {labels[labels.length - 1]}
      </span>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", className)}>{value}</span>
    </div>
  );
}
