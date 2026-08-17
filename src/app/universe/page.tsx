import { StockTable } from "@/components/stock-table";
import { colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealSource } from "@/components/real-price-columns";
import { getAllRealPrices } from "@/lib/real-price-listing";

const COLUMNS = [colRealRank, colRealCompany, colRealSector, colRealClose, colRealChange1d, colRealVolume, colRealSource];

export default async function UniversePage() {
  const rows = await getAllRealPrices();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Market Universe</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length.toLocaleString("en-IN")} companies with real price data ingested from NSE and BSE. Click a company for financials, announcements, and news.
        </p>
      </div>
      <StockTable data={rows} columns={COLUMNS} searchPlaceholder="Search by company or symbol..." pageSize={30} initialSorting={[{ id: "company", desc: false }]} />
    </div>
  );
}
