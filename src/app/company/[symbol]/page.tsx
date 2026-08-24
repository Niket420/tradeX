import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RealCompanyHeader } from "@/components/real-company-header";
import { getRealCompanyBySymbol } from "@/lib/real-company-lookup";
import { computeFinancialGrowth, computePriceReturns } from "@/lib/features";
import { formatCr, formatPct } from "@/lib/format";
import { getCompany } from "@/lib/mock-data";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPctOrDash(value: number | null, withSign = true): string {
  return value === null ? "—" : formatPct(value, withSign);
}

/**
 * Real-data company page. Looks up the symbol against the real (Postgres)
 * company universe first — ~99.4% of the app's symbols resolve here. Score
 * Breakdown / Multibagger Score / AI Research Summary are intentionally
 * omitted: there is no scoring engine, and those numbers would otherwise
 * have to be fabricated.
 */
export default async function CompanyDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const company = await getRealCompanyBySymbol(symbol);

  if (!company) {
    const mock = getCompany(symbol);
    if (!mock) notFound();
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">{mock.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{mock.symbol}</p>
        </div>
        <Card className="p-6 text-center text-sm text-muted-foreground">No real data tracked for this company yet.</Card>
      </div>
    );
  }

  const growth = computeFinancialGrowth(company.financialStatements);
  const returns = computePriceReturns(company.priceHistory);
  const symbolLabel = company.nseSymbol ?? company.bseSymbol;

  return (
    <div className="flex flex-col gap-6">
      <RealCompanyHeader companyName={company.companyName} symbol={symbolLabel} isin={company.isin} sector={company.sector} industry={company.industry} returns={returns} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Financial Growth</h2>
          {growth ? (
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Stat label="Revenue QoQ" value={fmtPctOrDash(growth.revenueQoQGrowthPct)} />
              <Stat label="Revenue YoY" value={fmtPctOrDash(growth.revenueYoYGrowthPct)} />
              <Stat label="PAT QoQ" value={fmtPctOrDash(growth.patQoQGrowthPct)} />
              <Stat label="PAT YoY" value={fmtPctOrDash(growth.patYoYGrowthPct)} />
              <Stat label="EPS YoY" value={fmtPctOrDash(growth.epsYoYGrowthPct)} />
              <Stat label="EBITDA margin" value={fmtPctOrDash(growth.ebitdaMarginPct, false)} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No financial data available yet.</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Price Returns</h2>
          {returns ? (
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Stat label="1D" value={fmtPctOrDash(returns.return1D)} />
              <Stat label="1W" value={fmtPctOrDash(returns.return1W)} />
              <Stat label="1M" value={fmtPctOrDash(returns.return1M)} />
              <Stat label="3M" value={fmtPctOrDash(returns.return3M)} />
              <Stat label="6M" value={fmtPctOrDash(returns.return6M)} />
              <Stat label="From 52W high" value={fmtPctOrDash(returns.distanceFrom52WeekHighPct)} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No price data available yet.</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Financial Statements</h2>
        {company.financialStatements.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No data available yet.</p>
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
            <p className="mt-2 text-xs text-muted-foreground">No data available yet.</p>
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
          <h2 className="text-sm font-semibold">Recent News</h2>
          {company.newsArticles.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No data available yet.</p>
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
          <p className="mt-2 text-xs text-muted-foreground">No data available yet.</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Price History (last {Math.min(company.priceHistory.length, 10)} trading days)</h2>
        {company.priceHistory.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No data available yet.</p>
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
                  <th className="py-1.5 pr-3 font-medium">Source</th>
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
                    <td className="py-1.5 pr-3 text-muted-foreground uppercase">{p.source}</td>
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
