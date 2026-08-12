import { StockTable } from "@/components/stock-table";
import { colRank, colCompany, colSector, colEbitdaMargin, colMarginChange, colMarginExpansionScore, colRoce, colChange6m } from "@/components/company-columns";
import { marginExpansionLeaders } from "@/lib/mock-data";

const COLUMNS = [colRank, colCompany, colSector, colEbitdaMargin, colMarginChange, colMarginExpansionScore, colRoce, colChange6m];

export default function MarginExpansionPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Margin Expansion</h1>
        <p className="text-sm text-muted-foreground">Companies where EBITDA margins have expanded the most over the tracked window — often an early sign of operating leverage or pricing power.</p>
      </div>
      <StockTable data={marginExpansionLeaders} columns={COLUMNS} searchPlaceholder="Search companies..." pageSize={30} />
    </div>
  );
}
