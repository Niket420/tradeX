"use client";

import { RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SECTORS } from "@/lib/types";

export interface UniverseFilters {
  sector: string;
  marketCapTier: string;
  minMultibaggerScore: number;
  minRevenueGrowth: number;
  maxPe: number;
}

export const DEFAULT_UNIVERSE_FILTERS: UniverseFilters = {
  sector: "all",
  marketCapTier: "all",
  minMultibaggerScore: 0,
  minRevenueGrowth: -100,
  maxPe: 1000,
};

const MIN_SCORE_OPTIONS = [0, 40, 55, 70, 85];
const MIN_GROWTH_OPTIONS = [-100, 0, 10, 20, 30];
const MAX_PE_OPTIONS = [1000, 60, 40, 25, 15];

interface FilterBarProps {
  filters: UniverseFilters;
  onChange: (filters: UniverseFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const update = <K extends keyof UniverseFilters>(key: K, value: UniverseFilters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.sector} onValueChange={(v) => update("sector", v ?? "all")}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Sector" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sectors</SelectItem>
          {SECTORS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.marketCapTier} onValueChange={(v) => update("marketCapTier", v ?? "all")}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Market cap" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All market caps</SelectItem>
          <SelectItem value="large">Large cap</SelectItem>
          <SelectItem value="mid">Mid cap</SelectItem>
          <SelectItem value="small">Small cap</SelectItem>
          <SelectItem value="micro">Micro cap</SelectItem>
        </SelectContent>
      </Select>

      <Select value={String(filters.minMultibaggerScore)} onValueChange={(v) => update("minMultibaggerScore", Number(v))}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Min score" />
        </SelectTrigger>
        <SelectContent>
          {MIN_SCORE_OPTIONS.map((v) => (
            <SelectItem key={v} value={String(v)}>
              {v === 0 ? "Any Multibagger score" : `Score ≥ ${v}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(filters.minRevenueGrowth)} onValueChange={(v) => update("minRevenueGrowth", Number(v))}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Min growth" />
        </SelectTrigger>
        <SelectContent>
          {MIN_GROWTH_OPTIONS.map((v) => (
            <SelectItem key={v} value={String(v)}>
              {v === -100 ? "Any revenue growth" : `Growth ≥ ${v}%`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(filters.maxPe)} onValueChange={(v) => update("maxPe", Number(v))}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Max PE" />
        </SelectTrigger>
        <SelectContent>
          {MAX_PE_OPTIONS.map((v) => (
            <SelectItem key={v} value={String(v)}>
              {v === 1000 ? "Any valuation" : `PE ≤ ${v}x`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={() => onChange(DEFAULT_UNIVERSE_FILTERS)}>
        <RotateCcw className="h-3 w-3" />
        Reset
      </Button>
    </div>
  );
}

export function applyUniverseFilters<T extends { sector: string; marketCapTier: string; scores: { multibagger: number }; quarterlyHistory: { revenueGrowthYoY: number }[]; pe: number }>(
  data: T[],
  filters: UniverseFilters
): T[] {
  return data.filter((c) => {
    if (filters.sector !== "all" && c.sector !== filters.sector) return false;
    if (filters.marketCapTier !== "all" && c.marketCapTier !== filters.marketCapTier) return false;
    if (c.scores.multibagger < filters.minMultibaggerScore) return false;
    if (c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY < filters.minRevenueGrowth) return false;
    if (c.pe > filters.maxPe) return false;
    return true;
  });
}
