import Link from "next/link";
import { ArrowRight, Building2, Gauge, Landmark, Rocket, Sparkles, TrendingUp, Activity, BadgeIndianRupee } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { SignalBadge } from "@/components/signal-badge";
import { formatPct, changeColorClass } from "@/lib/format";
import { dashboardStats, dashboardSparklines, emergingSignals, biggestFundamentalChanges } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";

// Real data from Postgres, layered onto the otherwise-mock dashboard: only
// this one stat is backed by the actual ingested company universe so far.
// Falls back to the mock figure if the database isn't reachable (e.g. local
// Postgres not running) rather than crashing the whole dashboard.
async function getRealCompanyCount(): Promise<number | null> {
  try {
    return await prisma.company.count();
  } catch {
    return null;
  }
}

// Companies with at least one real ingested FinancialStatement, PriceHistory,
// or Announcement (NSE or BSE) — link out to the dedicated /data/[isin]
// pages rather than the mock /company/[symbol] pages, since mock companies
// have no real ISIN to bridge to.
async function getCompaniesWithRealData() {
  try {
    const where = { OR: [{ financialStatements: { some: {} } }, { priceHistory: { some: {} } }, { announcements: { some: {} } }] };
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        select: { isin: true, companyName: true, nseSymbol: true, bseCode: true },
        orderBy: { companyName: "asc" },
        take: 12,
      }),
      prisma.company.count({ where }),
    ]);
    return { companies, total };
  } catch {
    return { companies: [], total: 0 };
  }
}

export default async function DashboardPage() {
  const realCompanyCount = await getRealCompanyCount();
  const { companies: companiesWithRealData, total: realDataCompanyCount } = await getCompaniesWithRealData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">What is happening in the Indian stock universe today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          label="Total companies tracked"
          value={(realCompanyCount ?? dashboardStats.totalCompaniesTracked).toLocaleString("en-IN")}
          icon={Building2}
          spark={dashboardSparklines.totalCompaniesTracked}
          hint={realCompanyCount === null ? "Mock data — Postgres not reachable" : "Live from PostgreSQL"}
        />
        <MetricCard
          label="Positive earnings acceleration"
          value={dashboardStats.positiveEarningsAcceleration}
          icon={TrendingUp}
          spark={dashboardSparklines.positiveEarningsAcceleration}
        />
        <MetricCard
          label="Accelerating revenue"
          value={dashboardStats.acceleratingRevenue}
          icon={Activity}
          spark={dashboardSparklines.acceleratingRevenue}
        />
        <MetricCard
          label="Accelerating profit"
          value={dashboardStats.acceleratingProfit}
          icon={Rocket}
          spark={dashboardSparklines.acceleratingProfit}
        />
        <MetricCard
          label="Margin expansion"
          value={dashboardStats.marginExpansion}
          icon={Gauge}
          spark={dashboardSparklines.marginExpansion}
        />
        <MetricCard
          label="Positive earnings surprises"
          value={dashboardStats.positiveEarningsSurprises}
          icon={BadgeIndianRupee}
          spark={dashboardSparklines.positiveEarningsSurprises}
        />
        <MetricCard
          label="Unusual volume"
          value={dashboardStats.unusualVolume}
          icon={Landmark}
          spark={dashboardSparklines.unusualVolume}
        />
        <MetricCard
          label="New Multibagger Radar entries"
          value={dashboardStats.newMultibaggerEntrants}
          icon={Sparkles}
          spark={dashboardSparklines.newMultibaggerEntrants}
        />
      </div>

      {companiesWithRealData.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Real Data (NSE + BSE)</h2>
                <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400">Live from Postgres</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {realDataCompanyCount.toLocaleString("en-IN")} companies with real financials/prices/announcements ingested so far — separate from the mock research pages below.
              </p>
            </div>
            <Link href="/data" className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
              View all prices <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            {companiesWithRealData.map((c) => (
              <Link
                key={c.isin}
                href={`/data/${c.isin}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <span className="text-sm font-medium">{c.companyName}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {c.isin} {c.nseSymbol ? `· NSE: ${c.nseSymbol}` : c.bseCode ? `· BSE: ${c.bseCode}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Emerging Signals</h2>
            <p className="text-xs text-muted-foreground">Companies where something meaningful has recently changed.</p>
          </div>
          <Link href="/emerging" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {emergingSignals.map(({ company, signal }) => (
            <Link
              key={signal.id}
              href={`/company/${company.symbol}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{company.name}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{company.symbol}</span>
                </div>
                <ScoreBadge score={company.scores.multibagger} />
              </div>
              <SignalBadge type={signal.type} label={signal.label} severity={signal.severity} />
              <p className="text-xs text-muted-foreground">{signal.detail}</p>
              <span className={cn("font-mono text-xs tabular-nums", changeColorClass(company.change1d))}>
                Price {formatPct(company.change1d)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">Biggest Fundamental Changes</h2>
          <p className="text-xs text-muted-foreground">Companies ranked by change, not absolute quality.</p>
        </div>
        <Card className="divide-y divide-border p-0">
          {biggestFundamentalChanges.map((company, idx) => {
            const delta = company.scores.multibagger - company.previousScores.multibagger;
            return (
              <Link
                key={company.symbol}
                href={`/company/${company.symbol}`}
                className="flex items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-muted/30"
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{idx + 1}</span>
                <div className="flex-1">
                  <span className="font-medium">{company.name}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{company.symbol}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">· {company.sector}</span>
                </div>
                <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
                  {company.previousScores.multibagger} → {company.scores.multibagger}
                </span>
                <span className={cn("font-mono text-xs font-medium tabular-nums", delta >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              </Link>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
