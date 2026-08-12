import { StockTable } from "@/components/stock-table";
import { colRank, colCompany, colSector, colPe, colValuationScore, colRevenueGrowth, colProfitGrowth, colMultibaggerScore } from "@/components/company-columns";
import { valuationLens } from "@/lib/mock-data";

const COLUMNS = [colRank, colCompany, colSector, colPe, colValuationScore, colRevenueGrowth, colProfitGrowth, colMultibaggerScore];

export default function ValuationPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Valuation</h1>
        <p className="text-sm text-muted-foreground">Companies ranked by valuation relative to their growth — a cheaper multiple for the same growth profile scores higher.</p>
      </div>
      <StockTable data={valuationLens} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} />
    </div>
  );
}
