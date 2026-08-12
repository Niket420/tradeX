import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CompanyHeader } from "@/components/company-header";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { FinancialChart } from "@/components/financial-chart";
import { ScoreBadge } from "@/components/score-badge";
import { SignalBadge } from "@/components/signal-badge";
import { formatCr, formatPct, formatDate, changeColorClass } from "@/lib/format";
import { getCompany } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default async function CompanyDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const company = getCompany(symbol);
  if (!company) notFound();

  const h = company.quarterlyHistory;
  const latest = h[h.length - 1];
  const first = h[0];

  const radarData = [
    { dimension: "Quality", value: company.scores.quality },
    { dimension: "Growth", value: company.scores.growth },
    { dimension: "Acceleration", value: company.scores.earningsAcceleration },
    { dimension: "Valuation", value: company.scores.valuation },
    { dimension: "Momentum", value: company.scores.momentum },
    { dimension: "Profitability", value: Math.min(100, Math.round(latest.ebitdaMargin * 3)) },
    { dimension: "Fin. Strength", value: Math.max(0, Math.min(100, Math.round(100 - company.debtToEquity * 28 + latest.roce * 0.9))) },
    { dimension: "Institutional", value: company.scores.institutionalActivity },
  ];

  const peers = company.peers.map((s) => getCompany(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const orders = company.news.filter((n) => n.category === "order");

  return (
    <div className="flex flex-col gap-6">
      <CompanyHeader company={company} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Score Breakdown</h2>
          <p className="text-xs text-muted-foreground">Multibagger Radar Score: <span className="font-mono text-foreground">{company.scores.multibagger}/100</span></p>
          <ScoreBreakdown data={radarData} height={260} />
        </Card>

        <Card className="flex flex-col gap-3 p-4 xl:col-span-2">
          <div>
            <h2 className="text-sm font-semibold">What&apos;s Changing?</h2>
            <p className="text-xs text-muted-foreground">Business trajectory over the last {h.length} quarters — the change matters more than the level.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChangeRow label="Revenue growth" from={`${first.revenueGrowthYoY}%`} to={`${latest.revenueGrowthYoY}%`} positive={latest.revenueGrowthYoY >= first.revenueGrowthYoY} />
            <ChangeRow label="Profit growth" from={`${first.profitGrowthYoY}%`} to={`${latest.profitGrowthYoY}%`} positive={latest.profitGrowthYoY >= first.profitGrowthYoY} />
            <ChangeRow label="EBITDA margin" from={`${first.ebitdaMargin}%`} to={`${latest.ebitdaMargin}%`} positive={latest.ebitdaMargin >= first.ebitdaMargin} />
            <ChangeRow label="Debt" from={formatCr(first.debtCr)} to={formatCr(latest.debtCr)} positive={latest.debtCr <= first.debtCr} />
            <ChangeRow
              label="Institutional ownership (FII+DII)"
              from={`${(company.shareholding.fii + company.shareholding.dii - company.shareholding.fiiChange - company.shareholding.diiChange).toFixed(1)}%`}
              to={`${(company.shareholding.fii + company.shareholding.dii).toFixed(1)}%`}
              positive={company.shareholding.fiiChange + company.shareholding.diiChange >= 0}
            />
            <ChangeRow label="ROCE" from={`${first.roce}%`} to={`${latest.roce}%`} positive={latest.roce >= first.roce} />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Business Overview</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{company.businessOverview}</p>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Financial Growth</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Revenue (₹ Cr)</span>
            <FinancialChart data={h} dataKey="revenueCr" type="bar" format="cr" color="var(--chart-1)" />
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Profit (₹ Cr)</span>
            <FinancialChart data={h} dataKey="profitCr" type="bar" format="cr" color="var(--chart-2)" />
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-muted-foreground">EBITDA Margin (%)</span>
            <FinancialChart data={h} dataKey="ebitdaMargin" type="line" format="pct" color="var(--chart-4)" />
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Revenue Growth YoY (%)</span>
            <FinancialChart data={h} dataKey="revenueGrowthYoY" type="line" format="pct" color="var(--chart-3)" />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Operating Cash Flow (₹ Cr)</span>
          <FinancialChart data={h} dataKey="operatingCashFlowCr" type="bar" format="cr" color="var(--chart-2)" height={180} />
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Debt (₹ Cr)</span>
          <FinancialChart data={h} dataKey="debtCr" type="bar" format="cr" color="var(--chart-3)" height={180} />
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">ROE (%)</span>
          <FinancialChart data={h} dataKey="roe" type="line" format="pct" color="var(--chart-1)" height={180} />
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">ROCE (%)</span>
          <FinancialChart data={h} dataKey="roce" type="line" format="pct" color="var(--chart-5)" height={180} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Peer Comparison</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Company</th>
                  <th className="py-1.5 pr-3 font-medium">Mkt Cap</th>
                  <th className="py-1.5 pr-3 font-medium">PE</th>
                  <th className="py-1.5 pr-3 font-medium">Quality</th>
                  <th className="py-1.5 pr-3 font-medium">Multibagger</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60 bg-primary/5 font-medium">
                  <td className="py-1.5 pr-3">{company.name}</td>
                  <td className="py-1.5 pr-3 font-mono">{formatCr(company.marketCapCr)}</td>
                  <td className="py-1.5 pr-3 font-mono">{company.pe}x</td>
                  <td className="py-1.5 pr-3"><ScoreBadge score={company.scores.quality} /></td>
                  <td className="py-1.5 pr-3"><ScoreBadge score={company.scores.multibagger} /></td>
                </tr>
                {peers.map((p) => (
                  <tr key={p.symbol} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">
                      <Link href={`/company/${p.symbol}`} className="hover:text-primary">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{formatCr(p.marketCapCr)}</td>
                    <td className="py-1.5 pr-3 font-mono">{p.pe}x</td>
                    <td className="py-1.5 pr-3"><ScoreBadge score={p.scores.quality} /></td>
                    <td className="py-1.5 pr-3"><ScoreBadge score={p.scores.multibagger} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold">Shareholding</h2>
          <ShareholdingBar label="Promoter" value={company.shareholding.promoter} change={company.shareholding.promoterChange} />
          <ShareholdingBar label="FII" value={company.shareholding.fii} change={company.shareholding.fiiChange} />
          <ShareholdingBar label="DII" value={company.shareholding.dii} change={company.shareholding.diiChange} />
          <ShareholdingBar label="Public" value={company.shareholding.public} change={0} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold">Recent Results — {company.earnings.quarter}</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <EarningsStat label="Revenue" expected={formatCr(company.earnings.expectedRevenueCr)} actual={formatCr(company.earnings.actualRevenueCr)} surprise={company.earnings.revenueSurprisePct} />
            <EarningsStat label="Profit" expected={formatCr(company.earnings.expectedProfitCr)} actual={formatCr(company.earnings.actualProfitCr)} surprise={company.earnings.profitSurprisePct} />
            <EarningsStat label="EPS" expected={`₹${company.earnings.expectedEps}`} actual={`₹${company.earnings.actualEps}`} surprise={company.earnings.epsSurprisePct} />
            <div className="flex flex-col">
              <span className="text-muted-foreground">Stock reaction</span>
              <span className={cn("font-mono tabular-nums", changeColorClass(company.earnings.stockReactionPct))}>{formatPct(company.earnings.stockReactionPct)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Result date: {formatDate(company.earnings.resultDate)}</p>
        </Card>

        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold">Recent News</h2>
          {company.news.map((n, i) => (
            <div key={i} className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 text-xs last:border-0">
              <span className="text-foreground/85">{n.headline}</span>
              <span className="shrink-0 text-muted-foreground">{formatDate(n.date)}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold">Orders / Contracts</h2>
          {orders.length > 0 ? (
            orders.map((o, i) => (
              <p key={i} className="text-xs text-foreground/85">
                {o.headline} <span className="text-muted-foreground">— {formatDate(o.date)}</span>
              </p>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No recent order announcements.</p>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold">Management Guidance</h2>
          <p className="text-xs text-foreground/85">{company.managementGuidance}</p>
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold">Risk Factors</h2>
          <ul className="flex flex-col gap-1.5 text-xs text-foreground/85">
            {company.riskFactors.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">AI Research Summary</h2>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{company.aiThesis}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {company.signals.map((s) => (
            <SignalBadge key={s.id} type={s.type} label={s.label} severity={s.severity} />
          ))}
        </div>
        <p className="mt-2 inline-block w-fit rounded-md border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-400">
          This is a research signal, not a buy recommendation.
        </p>
      </Card>
    </div>
  );
}

function ChangeRow({ label, from, to, positive }: { label: string; from: string; to: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        <span className="text-muted-foreground">{from}</span>
        <span className="mx-1.5 text-muted-foreground">→</span>
        <span className={positive ? "text-emerald-400" : "text-rose-400"}>{to}</span>
      </span>
    </div>
  );
}

function ShareholdingBar({ label, value, change }: { label: string; value: number; change: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {value.toFixed(1)}%{change !== 0 ? <span className={cn("ml-1", change > 0 ? "text-emerald-400" : "text-rose-400")}>({change > 0 ? "+" : ""}{change.toFixed(1)}pp)</span> : null}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function EarningsStat({ label, expected, actual, surprise }: { label: string; expected: string; actual: string; surprise: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        {actual} <span className="text-muted-foreground">vs est. {expected}</span>
      </span>
      <span className={cn("font-mono text-[11px] tabular-nums", changeColorClass(surprise))}>{formatPct(surprise)} surprise</span>
    </div>
  );
}
