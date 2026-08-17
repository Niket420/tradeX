"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { changeColorClass, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RealPriceRow {
  isin: string;
  companyName: string;
  nseSymbol: string | null;
  bseCode: string | null;
  bseSymbol: string | null;
  sector: string | null;
  latestDate: string;
  latestClose: number;
  latestVolume: number;
  latestSource: string;
  change1dPct: number | null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const colRealRank: ColumnDef<RealPriceRow> = {
  id: "rank",
  header: "#",
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.index + 1}</span>,
  enableSorting: false,
  size: 40,
};

export const colRealCompany: ColumnDef<RealPriceRow> = {
  id: "company",
  header: "Company",
  accessorFn: (c) => c.companyName,
  cell: ({ row }) => {
    const c = row.original;
    const symbol = c.nseSymbol ?? c.bseSymbol;
    return (
      <Link href={symbol ? `/company/${symbol}` : `/data/${c.isin}`} className="group flex flex-col">
        <span className="font-medium text-foreground group-hover:text-primary">{c.companyName}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {c.isin} {c.nseSymbol ? `· NSE: ${c.nseSymbol}` : c.bseCode ? `· BSE: ${c.bseCode}` : ""}
        </span>
      </Link>
    );
  },
  size: 280,
};

export const colRealSector: ColumnDef<RealPriceRow> = {
  id: "sector",
  header: "Sector",
  accessorFn: (c) => c.sector ?? "",
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.sector ?? "—"}</span>,
};

export const colRealClose: ColumnDef<RealPriceRow> = {
  id: "close",
  header: "Close",
  accessorFn: (c) => c.latestClose,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">₹{row.original.latestClose.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
};

export const colRealChange1d: ColumnDef<RealPriceRow> = {
  id: "change1d",
  header: "1D %",
  accessorFn: (c) => c.change1dPct ?? 0,
  cell: ({ row }) => {
    const v = row.original.change1dPct;
    return v === null ? <span className="text-xs text-muted-foreground">—</span> : <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>{formatPct(v)}</span>;
  },
};

export const colRealVolume: ColumnDef<RealPriceRow> = {
  id: "volume",
  header: "Volume",
  accessorFn: (c) => c.latestVolume,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.latestVolume.toLocaleString("en-IN")}</span>,
};

export const colRealDate: ColumnDef<RealPriceRow> = {
  id: "date",
  header: "As Of",
  accessorFn: (c) => c.latestDate,
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDate(row.original.latestDate)}</span>,
};

export const colRealSource: ColumnDef<RealPriceRow> = {
  id: "source",
  header: "Source",
  accessorFn: (c) => c.latestSource,
  cell: ({ row }) => <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{row.original.latestSource}</span>,
};
