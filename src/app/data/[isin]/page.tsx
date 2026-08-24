import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { computeFinancialGrowth, computePriceReturns } from "@/lib/features";
import { computeFreshness } from "@/lib/data-freshness";
import { formatCr, formatPct } from "@/lib/format";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtOrNoData(value: number | string | null | undefined, formatter?: (v: number) => string): string {
  if (value === null || value === undefined) return "No data available yet";
  if (typeof value === "number" && formatter) return formatter(value);
  return String(value);
}

/** Real-data-only company page — separate from the mock /company/[symbol] pages by design (see AGENTS.md ingestion notes: don't redesign existing UI, only add real data where it genuinely exists). Every value here comes straight from Postgres; nothing is fabricated. */
export default async function RealCompanyDataPage({ params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;
  const isinUpper = isin.toUpperCase();

  const company = await prisma.company.findUnique({
    where: { isin: isinUpper },
    include: {
      financialStatements: { orderBy: [{ fiscalYear: "desc" }, { fiscalQuarter: "desc" }] },
      priceHistory: { orderBy: { date: "desc" }, take: 400 },
      announcements: { orderBy: { announcementDate: "desc" }, take: 15 },
      newsArticles: { orderBy: { publishedAt: "desc" }, take: 15 },
      shareholdings: { orderBy: { asOfDate: "desc" }, take: 20 },
    },
  });

  if (!company) notFound();

  const growth = computeFinancialGrowth(company.financialStatements);
  const returns = computePriceReturns(company.priceHistory);

  const sources = new Set([...company.financialStatements.map((f) => f.source), ...company.priceHistory.map((p) => p.source), ...company.announcements.map((a) => a.source)]);
  const sourceLabel = sources.size > 0 ? [...sources].map((s) => s.toUpperCase()).sort().join(" + ") : "no data yet";

  const financialsFreshness = computeFreshness(company.financialStatements);
  const pricesFreshness = computeFreshness(company.priceHistory);
  const announcementsFreshness = computeFreshness(company.announcements);
  const newsFreshness = computeFreshness(company.newsArticles.map((n) => ({ ...n, source: "gdelt" })));
  const shareholdingFreshness = computeFreshness(company.shareholdings);
  const priceDaysSpan =
    company.priceHistory.length > 0 ? Math.round((company.priceHistory[0].date.getTime() - company.priceHistory[company.priceHistory.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{company.companyName}</h1>
          <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400">Real data ({sourceLabel})</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {company.isin} {company.nseSymbol ? `· NSE: ${company.nseSymbol}` : ""} {company.bseCode ? `· BSE: ${company.bseCode}` : ""}
        </p>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Data Status</h2>
        <p className="text-xs text-muted-foreground">Whether our ingestion pipeline is actually working for this company — real timestamps from Postgres, not hardcoded.</p>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
          <FreshnessStat label="Financials" freshness={financialsFreshness} extra={`${financialsFreshness.periodsAvailable} period(s)`} />
          <FreshnessStat label="Prices" freshness={pricesFreshness} extra={`${priceDaysSpan} day(s) history`} />
          <FreshnessStat label="Announcements" freshness={announcementsFreshness} extra={`${announcementsFreshness.periodsAvailable} record(s)`} />
          <FreshnessStat label="News" freshness={newsFreshness} extra={`${newsFreshness.periodsAvailable} article(s)`} />
          <FreshnessStat label="Shareholding" freshness={shareholdingFreshness} extra={`${shareholdingFreshness.periodsAvailable} period(s)`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Financial Growth (computed from stored results)</h2>
          {growth ? (
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Revenue QoQ" value={fmtOrNoData(growth.revenueQoQGrowthPct, (v) => formatPct(v))} />
              <Stat label="Revenue YoY" value={fmtOrNoData(growth.revenueYoYGrowthPct, (v) => formatPct(v))} />
              <Stat label="PAT QoQ" value={fmtOrNoData(growth.patQoQGrowthPct, (v) => formatPct(v))} />
              <Stat label="PAT YoY" value={fmtOrNoData(growth.patYoYGrowthPct, (v) => formatPct(v))} />
              <Stat label="EPS YoY" value={fmtOrNoData(growth.epsYoYGrowthPct, (v) => formatPct(v))} />
              <Stat label="EBITDA margin" value={fmtOrNoData(growth.ebitdaMarginPct, (v) => formatPct(v, false))} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Price Returns (computed from stored history)</h2>
          {returns ? (
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
              <Stat label="1D" value={fmtOrNoData(returns.return1D, (v) => formatPct(v))} />
              <Stat label="1W" value={fmtOrNoData(returns.return1W, (v) => formatPct(v))} />
              <Stat label="1M" value={fmtOrNoData(returns.return1M, (v) => formatPct(v))} />
              <Stat label="3M" value={fmtOrNoData(returns.return3M, (v) => formatPct(v))} />
              <Stat label="6M" value={fmtOrNoData(returns.return6M, (v) => formatPct(v))} />
              <Stat label="1Y" value={fmtOrNoData(returns.return1Y, (v) => formatPct(v))} />
              <Stat label="From 52W high" value={fmtOrNoData(returns.distanceFrom52WeekHighPct, (v) => formatPct(v))} />
              <Stat label="Latest close" value={fmtOrNoData(returns.latestClose, (v) => `₹${v.toLocaleString("en-IN")}`)} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Financial Statements</h2>
        {company.financialStatements.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Period</th>
                  <th className="py-1.5 pr-3 font-medium">Revenue</th>
                  <th className="py-1.5 pr-3 font-medium">PAT</th>
                  <th className="py-1.5 pr-3 font-medium">EPS</th>
                  <th className="py-1.5 pr-3 font-medium">Debt/Equity</th>
                  <th className="py-1.5 pr-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {company.financialStatements.map((f) => (
                  <tr key={f.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">{f.period}</td>
                    <td className="py-1.5 pr-3 font-mono">{f.revenue !== null ? formatCr(Number(f.revenue) / 1e7) : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{f.pat !== null ? formatCr(Number(f.pat) / 1e7) : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{f.eps !== null ? `₹${f.eps}` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{f.debtEquity !== null ? f.debtEquity.toString() : "—"}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Recent Announcements</h2>
          {company.announcements.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {company.announcements.map((a) => (
                <a key={a.id} href={a.sourceUrl} target="_blank" rel="noreferrer" className="border-b border-border/60 py-1.5 text-xs last:border-0 hover:text-primary">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    <span className="shrink-0 text-muted-foreground">{fmtDate(a.announcementDate)}</span>
                  </div>
                  {a.description && <p className="mt-0.5 line-clamp-2 text-muted-foreground">{a.description}</p>}
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Recent News (GDELT)</h2>
          {company.newsArticles.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {company.newsArticles.map((n) => (
                <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 text-xs last:border-0 hover:text-primary">
                  <span>
                    {n.title} <span className="text-muted-foreground">({n.sourceDomain})</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{n.publishedAt ? fmtDate(n.publishedAt) : ""}</span>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Shareholding Pattern</h2>
        {company.shareholdings.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">As Of</th>
                  <th className="py-1.5 pr-3 font-medium">Promoter</th>
                  <th className="py-1.5 pr-3 font-medium">Public</th>
                  <th className="py-1.5 pr-3 font-medium">FII</th>
                  <th className="py-1.5 pr-3 font-medium">DII</th>
                  <th className="py-1.5 pr-3 font-medium">Mutual Funds</th>
                  <th className="py-1.5 pr-3 font-medium">Pledged</th>
                </tr>
              </thead>
              <tbody>
                {company.shareholdings.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">{fmtDate(s.asOfDate)}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.promoterHolding !== null ? `${s.promoterHolding}%` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.publicHolding !== null ? `${s.publicHolding}%` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.fiiHolding !== null ? `${s.fiiHolding}%` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.diiHolding !== null ? `${s.diiHolding}%` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.mutualFundHolding !== null ? `${s.mutualFundHolding}%` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.pledgedPercentage !== null ? `${s.pledgedPercentage}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Price History (last {company.priceHistory.length} trading days)</h2>
        {company.priceHistory.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No data available yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 pr-3 font-medium">Open</th>
                  <th className="py-1.5 pr-3 font-medium">High</th>
                  <th className="py-1.5 pr-3 font-medium">Low</th>
                  <th className="py-1.5 pr-3 font-medium">Close</th>
                  <th className="py-1.5 pr-3 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {company.priceHistory.slice(0, 10).map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">{fmtDate(p.date)}</td>
                    <td className="py-1.5 pr-3 font-mono">{p.open !== null ? `₹${p.open.toString()}` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{p.high !== null ? `₹${p.high.toString()}` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{p.low !== null ? `₹${p.low.toString()}` : "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">₹{p.close.toString()}</td>
                    <td className="py-1.5 pr-3 font-mono">{p.volume.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function FreshnessStat({ label, freshness, extra }: { label: string; freshness: { source: string | null; lastUpdated: Date | null }; extra: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/60 p-2">
      <span className="font-medium text-foreground">{label}</span>
      {freshness.source ? (
        <>
          <span className="text-muted-foreground">{freshness.source}</span>
          <span className="text-muted-foreground">{extra}</span>
          <span className="text-muted-foreground">Updated {freshness.lastUpdated ? freshness.lastUpdated.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
        </>
      ) : (
        <span className="text-muted-foreground">No data yet</span>
      )}
    </div>
  );
}
