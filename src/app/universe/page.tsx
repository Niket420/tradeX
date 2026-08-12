"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StockTable } from "@/components/stock-table";
import { UNIVERSE_COLUMNS } from "@/components/company-columns";
import { DEFAULT_UNIVERSE_FILTERS, FilterBar, applyUniverseFilters, UniverseFilters } from "@/components/filter-bar";
import { companies, TOTAL_COMPANIES_TRACKED } from "@/lib/mock-data";

function UniverseContent() {
  const searchParams = useSearchParams();
  const initialSector = searchParams.get("sector");
  const [filters, setFilters] = useState<UniverseFilters>({
    ...DEFAULT_UNIVERSE_FILTERS,
    sector: initialSector ?? "all",
  });

  const filtered = useMemo(() => applyUniverseFilters(companies, filters), [filters]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Market Universe</h1>
        <p className="text-sm text-muted-foreground">
          The complete tracked universe — all {TOTAL_COMPANIES_TRACKED.toLocaleString("en-IN")} companies listed on NSE and/or BSE. Financials and
          scores are still mock/randomized pending a live data connection. Nothing is hidden for having a low score.
        </p>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      <StockTable data={filtered} columns={UNIVERSE_COLUMNS} searchPlaceholder="Search by company or symbol..." pageSize={30} initialSorting={[{ id: "marketCap", desc: true }]} />
    </div>
  );
}

export default function UniversePage() {
  return (
    <Suspense fallback={null}>
      <UniverseContent />
    </Suspense>
  );
}
