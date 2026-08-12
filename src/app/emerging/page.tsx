"use client";

import { useState } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPct, changeColorClass } from "@/lib/format";
import { emergingOpportunities } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function EmergingOpportunitiesPage() {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = emergingOpportunities.slice(0, visible);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Emerging Opportunities</h1>
        <p className="text-sm text-muted-foreground">Companies whose fundamentals are improving faster than the market has recognized.</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {shown.length.toLocaleString("en-IN")} of {emergingOpportunities.length.toLocaleString("en-IN")} companies with a rising score.
      </p>

      <div className="flex flex-col gap-3">
        {shown.map(({ company: c, scoreChange }, idx) => {
          const latest = c.quarterlyHistory[c.quarterlyHistory.length - 1];
          const first = c.quarterlyHistory[0];
          const reasons = c.signals.filter((s) =>
            ["revenue_acceleration", "profit_acceleration", "margin_expansion", "large_order", "institutional_buying"].includes(s.type)
          );
          return (
            <Card key={c.symbol} className="gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                  <div>
                    <Link href={`/company/${c.symbol}`} className="font-medium hover:text-primary">
                      {c.name}
                    </Link>
                    <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{c.symbol}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">· {c.sector}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {c.previousScores.multibagger} → {c.scores.multibagger}
                  </span>
                  <span className="font-mono text-xs font-medium tabular-nums text-emerald-400">+{scoreChange}</span>
                  <ScoreBadge score={c.scores.multibagger} size="md" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-xs sm:grid-cols-4">
                <MetricPair label="Revenue growth" prev={first.revenueGrowthYoY} curr={latest.revenueGrowthYoY} />
                <MetricPair label="Profit growth" prev={first.profitGrowthYoY} curr={latest.profitGrowthYoY} />
                <MetricPair label="EBITDA margin" prev={first.ebitdaMargin} curr={latest.ebitdaMargin} suffix="%" />
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Price change (6M)</span>
                  <span className={cn("font-mono tabular-nums", changeColorClass(c.change6m))}>{formatPct(c.change6m)}</span>
                </div>
              </div>

              {reasons.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t border-border pt-3 text-xs text-foreground/85">
                  {reasons.map((r) => (
                    <li key={r.id} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {r.detail}
                    </li>
                  ))}
                  {c.change6m < 10 ? (
                    <li className="flex items-start gap-1.5 text-emerald-400">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      Stock price only {formatPct(c.change6m)} over 6 months — fundamentals may be improving faster than the market has priced in.
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </div>

      {visible < emergingOpportunities.length ? (
        <Button variant="outline" size="sm" className="mx-auto" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}

function MetricPair({ label, prev, curr, suffix = "%" }: { label: string; prev: number; curr: number; suffix?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        <span className="text-muted-foreground">{prev}{suffix}</span> → <span className={changeColorClass(curr - prev)}>{curr}{suffix}</span>
      </span>
    </div>
  );
}
