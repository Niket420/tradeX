"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Company, Scores } from "@/lib/types";
import { changeColorClass, formatCr, formatPct, formatPrice } from "@/lib/format";
import { ScoreBadge } from "@/components/score-badge";
import { cn } from "@/lib/utils";

function num(value: number, decimals = 1): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const colRank: ColumnDef<Company> = {
  id: "rank",
  header: "#",
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.index + 1}</span>,
  enableSorting: false,
  size: 40,
};

export const colCompany: ColumnDef<Company> = {
  id: "company",
  header: "Company",
  accessorFn: (c) => c.name,
  cell: ({ row }) => {
    const c = row.original;
    return (
      <Link href={`/company/${c.symbol}`} className="group flex flex-col">
        <span className="font-medium text-foreground group-hover:text-primary">{c.name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{c.symbol}</span>
      </Link>
    );
  },
  size: 220,
};

export const colSector: ColumnDef<Company> = {
  id: "sector",
  header: "Sector",
  accessorFn: (c) => c.sector,
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.sector}</span>,
};

export const colIndustry: ColumnDef<Company> = {
  id: "industry",
  header: "Industry",
  accessorFn: (c) => c.industry,
  cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.industry}</span>,
};

export const colMarketCap: ColumnDef<Company> = {
  id: "marketCap",
  header: "Mkt Cap",
  accessorFn: (c) => c.marketCapCr,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatCr(row.original.marketCapCr)}</span>,
};

export const colPrice: ColumnDef<Company> = {
  id: "price",
  header: "Price",
  accessorFn: (c) => c.price,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatPrice(row.original.price)}</span>,
};

function changeColumn(id: "change1d" | "change1w" | "change1m" | "change6m" | "change1y", header: string): ColumnDef<Company> {
  return {
    id,
    header,
    accessorFn: (c) => c[id],
    cell: ({ row }) => {
      const v = row.original[id];
      return <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>{formatPct(v)}</span>;
    },
  };
}

export const colChange1d = changeColumn("change1d", "1D %");
export const colChange1w = changeColumn("change1w", "1W %");
export const colChange1m = changeColumn("change1m", "1M %");
export const colChange6m = changeColumn("change6m", "6M %");
export const colChange1y = changeColumn("change1y", "1Y %");

export const colRevenueGrowth: ColumnDef<Company> = {
  id: "revenueGrowth",
  header: "Rev Growth",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY,
  cell: ({ row }) => {
    const v = row.original.quarterlyHistory[row.original.quarterlyHistory.length - 1].revenueGrowthYoY;
    return <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>{formatPct(v)}</span>;
  },
};

export const colProfitGrowth: ColumnDef<Company> = {
  id: "profitGrowth",
  header: "Profit Growth",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].profitGrowthYoY,
  cell: ({ row }) => {
    const v = row.original.quarterlyHistory[row.original.quarterlyHistory.length - 1].profitGrowthYoY;
    return <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>{formatPct(v)}</span>;
  },
};

export const colEbitdaMargin: ColumnDef<Company> = {
  id: "ebitdaMargin",
  header: "EBITDA Margin",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{num(row.original.quarterlyHistory[row.original.quarterlyHistory.length - 1].ebitdaMargin)}%</span>,
};

export const colMarginChange: ColumnDef<Company> = {
  id: "marginChange",
  header: "Margin Chg",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin - c.quarterlyHistory[0].ebitdaMargin,
  cell: ({ row }) => {
    const h = row.original.quarterlyHistory;
    const v = h[h.length - 1].ebitdaMargin - h[0].ebitdaMargin;
    return (
      <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>
        {v > 0 ? "+" : ""}
        {num(v)}pp
      </span>
    );
  },
};

export const colRoe: ColumnDef<Company> = {
  id: "roe",
  header: "ROE",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].roe,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{num(row.original.quarterlyHistory[row.original.quarterlyHistory.length - 1].roe)}%</span>,
};

export const colRoce: ColumnDef<Company> = {
  id: "roce",
  header: "ROCE",
  accessorFn: (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].roce,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{num(row.original.quarterlyHistory[row.original.quarterlyHistory.length - 1].roce)}%</span>,
};

export const colDebtToEquity: ColumnDef<Company> = {
  id: "debtToEquity",
  header: "Debt/Equity",
  accessorFn: (c) => c.debtToEquity,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{num(row.original.debtToEquity, 2)}</span>,
};

export const colPe: ColumnDef<Company> = {
  id: "pe",
  header: "PE",
  accessorFn: (c) => c.pe,
  cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{num(row.original.pe)}x</span>,
};

export const colOrderBookGrowth: ColumnDef<Company> = {
  id: "orderBookGrowth",
  header: "Order Book",
  accessorFn: (c) => c.orderBookGrowthPct,
  cell: ({ row }) => {
    const v = row.original.orderBookGrowthPct;
    return <span className={cn("font-mono text-xs tabular-nums", changeColorClass(v))}>{formatPct(v)}</span>;
  },
};

export function scoreColumn(key: keyof Scores, header: string): ColumnDef<Company> {
  return {
    id: key,
    header,
    accessorFn: (c) => c.scores[key],
    cell: ({ row }) => <ScoreBadge score={row.original.scores[key]} />,
  };
}

export const colEarningsAcceleration = scoreColumn("earningsAcceleration", "Earnings Accel");
export const colGrowthScore = scoreColumn("growth", "Growth Score");
export const colQualityScore = scoreColumn("quality", "Quality Score");
export const colMultibaggerScore = scoreColumn("multibagger", "Multibagger Score");
export const colValuationScore = scoreColumn("valuation", "Valuation Score");
export const colMomentumScore = scoreColumn("momentum", "Momentum Score");
export const colMarginExpansionScore = scoreColumn("marginExpansion", "Margin Expansion");
export const colInstitutionalScore = scoreColumn("institutionalActivity", "Institutional");

export const UNIVERSE_COLUMNS: ColumnDef<Company>[] = [
  colRank,
  colCompany,
  colSector,
  colIndustry,
  colMarketCap,
  colPrice,
  colChange1d,
  colChange1w,
  colChange1m,
  colRevenueGrowth,
  colProfitGrowth,
  colEbitdaMargin,
  colMarginChange,
  colRoe,
  colRoce,
  colDebtToEquity,
  colPe,
  colEarningsAcceleration,
  colGrowthScore,
  colQualityScore,
  colMultibaggerScore,
];
