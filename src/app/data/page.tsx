import { Card } from "@/components/ui/card";
import { StockTable } from "@/components/stock-table";
import { colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealDate, colRealSource } from "@/components/real-price-columns";
import { getAllRealPrices } from "@/lib/real-price-listing";
import { prisma } from "@/lib/db/prisma";

const COLUMNS = [colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealDate, colRealSource];

async function getIngestionStatus() {
  const [
    totalCompanies,
    financialStatements,
    companiesWithFinancials,
    priceHistory,
    companiesWithPrices,
    announcements,
    newsArticles,
    shareholdings,
    lastSuccessfulRun,
    failedRunsLast24h,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.financialStatement.count(),
    prisma.company.count({ where: { financialStatements: { some: {} } } }),
    prisma.priceHistory.count(),
    prisma.company.count({ where: { priceHistory: { some: {} } } }),
    prisma.announcement.count(),
    prisma.newsArticle.count(),
    prisma.shareholding.count(),
    prisma.ingestionRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { completedAt: "desc" } }),
    prisma.ingestionRun.count({ where: { status: "FAILED", startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);
  return { totalCompanies, financialStatements, companiesWithFinancials, priceHistory, companiesWithPrices, announcements, newsArticles, shareholdings, lastSuccessfulRun, failedRunsLast24h };
}

export default async function RealPricesPage() {
  const [rows, status] = await Promise.all([getAllRealPrices(), getIngestionStatus()]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Real Prices (NSE + BSE)</h1>
          <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400">Live from Postgres</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length.toLocaleString("en-IN")} companies with real ingested price data. Click a company for full financials/announcements/news.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Ingestion Status</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <IngestStat label="Financial statements" value={status.financialStatements.toLocaleString("en-IN")} sub={`${status.companiesWithFinancials.toLocaleString("en-IN")} / ${status.totalCompanies.toLocaleString("en-IN")} companies`} />
          <IngestStat label="Price history" value={status.priceHistory.toLocaleString("en-IN")} sub={`${status.companiesWithPrices.toLocaleString("en-IN")} / ${status.totalCompanies.toLocaleString("en-IN")} companies`} />
          <IngestStat label="Announcements" value={status.announcements.toLocaleString("en-IN")} sub="rows" />
          <IngestStat label="News articles" value={status.newsArticles.toLocaleString("en-IN")} sub="rows (GDELT)" />
          <IngestStat label="Shareholding records" value={status.shareholdings.toLocaleString("en-IN")} sub="rows" />
          <IngestStat
            label="Last successful run"
            value={status.lastSuccessfulRun?.completedAt ? status.lastSuccessfulRun.completedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            sub={status.failedRunsLast24h > 0 ? `${status.failedRunsLast24h} failed run(s) in 24h` : "0 failed runs in 24h"}
          />
        </div>
      </Card>

      <StockTable data={rows} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} initialSorting={[{ id: "date", desc: true }]} />
    </div>
  );
}

function IngestStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/60 p-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}
