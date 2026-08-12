import { StockTable } from "@/components/stock-table";
import { colRank, colCompany, colSector, colOrderBookGrowth, colRevenueGrowth, colMultibaggerScore, colChange6m } from "@/components/company-columns";
import { orderBookRadar } from "@/lib/mock-data";

const COLUMNS = [colRank, colCompany, colSector, colOrderBookGrowth, colRevenueGrowth, colMultibaggerScore, colChange6m];

export default function OrderBookRadarPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Order Book Radar</h1>
        <p className="text-sm text-muted-foreground">Companies with the fastest-growing order books — a leading indicator for future revenue growth before it shows up in reported numbers.</p>
      </div>
      <StockTable data={orderBookRadar} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} />
    </div>
  );
}
