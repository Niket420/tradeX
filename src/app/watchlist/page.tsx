"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { StockTable } from "@/components/stock-table";
import {
  colCompany,
  colSector,
  colPrice,
  colChange1d,
  colChange1w,
  colChange1m,
  colMultibaggerScore,
} from "@/components/company-columns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { companies, defaultWatchlist } from "@/lib/mock-data";
import { Company } from "@/lib/types";

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState<string[]>(defaultWatchlist);
  const [toAdd, setToAdd] = useState<string>("");

  const watchlistCompanies = useMemo(() => companies.filter((c) => symbols.includes(c.symbol)), [symbols]);
  const available = useMemo(() => companies.filter((c) => !symbols.includes(c.symbol)), [symbols]);

  const removeColumn: ColumnDef<Company> = {
    id: "remove",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon-sm" onClick={() => setSymbols((s) => s.filter((sym) => sym !== row.original.symbol))}>
        <X className="h-3.5 w-3.5" />
      </Button>
    ),
    enableSorting: false,
  };

  const columns: ColumnDef<Company>[] = [colCompany, colSector, colPrice, colChange1d, colChange1w, colChange1m, colMultibaggerScore, removeColumn];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Watchlist</h1>
          <p className="text-sm text-muted-foreground">{watchlistCompanies.length} companies you&apos;re tracking closely.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={toAdd} onValueChange={(v) => setToAdd(v ?? "")}>
            <SelectTrigger className="h-8 w-56 text-xs">
              <SelectValue placeholder="Add a company..." />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.symbol} value={c.symbol}>
                  {c.name} ({c.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8"
            disabled={!toAdd}
            onClick={() => {
              if (toAdd) {
                setSymbols((s) => [...s, toAdd]);
                setToAdd("");
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {watchlistCompanies.length > 0 ? (
        <StockTable data={watchlistCompanies} columns={columns} searchPlaceholder="Search watchlist..." pageSize={30} enableColumnVisibility={false} />
      ) : (
        <p className="text-sm text-muted-foreground">Your watchlist is empty — add a company above.</p>
      )}
    </div>
  );
}
