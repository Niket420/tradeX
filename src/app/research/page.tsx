"use client";

import { useMemo, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { StockTable } from "@/components/stock-table";
import { UNIVERSE_COLUMNS } from "@/components/company-columns";
import { DEFAULT_UNIVERSE_FILTERS, FilterBar, applyUniverseFilters, UniverseFilters } from "@/components/filter-bar";
import { AIResearchPanel } from "@/components/ai-research-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { companies } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const SAVED_SCREENS: { name: string; description: string; filters: UniverseFilters }[] = [
  {
    name: "Emerging small caps",
    description: "Small/micro cap, Multibagger score ≥ 55",
    filters: { ...DEFAULT_UNIVERSE_FILTERS, marketCapTier: "small", minMultibaggerScore: 55 },
  },
  {
    name: "Cheap quality compounders",
    description: "PE ≤ 25 with meaningful growth",
    filters: { ...DEFAULT_UNIVERSE_FILTERS, maxPe: 25, minRevenueGrowth: 10 },
  },
  {
    name: "High acceleration",
    description: "Revenue growth ≥ 20%, any market cap",
    filters: { ...DEFAULT_UNIVERSE_FILTERS, minRevenueGrowth: 20 },
  },
];

export default function ResearchPage() {
  const [filters, setFilters] = useState<UniverseFilters>(DEFAULT_UNIVERSE_FILTERS);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);

  const filtered = useMemo(() => applyUniverseFilters(companies, filters), [filters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Research</h1>
          <p className="text-sm text-muted-foreground">Build custom screens across the universe, or ask the AI assistant a grounded question.</p>
        </div>
        <AIResearchPanel />
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="h-4 w-4 text-primary" />
          Saved screens
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SAVED_SCREENS.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setFilters(s.filters);
                setActiveScreen(s.name);
              }}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                activeScreen === s.name ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <div className="font-medium">{s.name}</div>
              <div className="mt-0.5 text-muted-foreground">{s.description}</div>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto justify-start text-xs text-muted-foreground"
            onClick={() => {
              setFilters(DEFAULT_UNIVERSE_FILTERS);
              setActiveScreen(null);
            }}
          >
            Clear screen
          </Button>
        </div>
      </Card>

      <FilterBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setActiveScreen(null);
        }}
      />
      <StockTable data={filtered} columns={UNIVERSE_COLUMNS} searchPlaceholder="Search within results..." pageSize={30} />
    </div>
  );
}
