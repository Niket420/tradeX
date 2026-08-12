import { StockTable } from "@/components/stock-table";
import { colRank, colCompany, colSector, colChange1d, colChange1w, colChange1m, colChange6m, colMomentumScore } from "@/components/company-columns";
import { momentumLeaders } from "@/lib/mock-data";

const COLUMNS = [colRank, colCompany, colSector, colChange1d, colChange1w, colChange1m, colChange6m, colMomentumScore];

export default function MomentumPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Momentum</h1>
        <p className="text-sm text-muted-foreground">Companies with the strongest price momentum across timeframes. Momentum can precede or lag fundamentals — cross-check with other lenses.</p>
      </div>
      <StockTable data={momentumLeaders} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} />
    </div>
  );
}
