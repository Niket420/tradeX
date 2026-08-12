import { StockTable } from "@/components/stock-table";
import {
  colRank,
  colCompany,
  colSector,
  colRevenueGrowth,
  colProfitGrowth,
  colEarningsAcceleration,
  colChange6m,
  colMultibaggerScore,
} from "@/components/company-columns";
import { growthAcceleration } from "@/lib/mock-data";

const COLUMNS = [colRank, colCompany, colSector, colRevenueGrowth, colProfitGrowth, colEarningsAcceleration, colChange6m, colMultibaggerScore];

export default function GrowthAccelerationPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Growth Acceleration</h1>
        <p className="text-sm text-muted-foreground">Companies ranked by how much their revenue and profit growth are accelerating, not just current growth level.</p>
      </div>
      <StockTable data={growthAcceleration} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} />
    </div>
  );
}
