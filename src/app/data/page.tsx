import { StockTable } from "@/components/stock-table";
import { colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealDate, colRealSource } from "@/components/real-price-columns";
import { getAllRealPrices } from "@/lib/real-price-listing";

const COLUMNS = [colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealDate, colRealSource];

export default async function RealPricesPage() {
  const rows = await getAllRealPrices();

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
      <StockTable data={rows} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} initialSorting={[{ id: "date", desc: true }]} />
    </div>
  );
}
