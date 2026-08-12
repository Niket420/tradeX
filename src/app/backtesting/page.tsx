"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPct, changeColorClass, formatDate } from "@/lib/format";
import { BACKTEST_PRESETS, DEFAULT_BACKTEST_FILTERS, runBacktest, runBacktestForSymbols } from "@/lib/mock-data";
import { usePaperPortfolio } from "@/lib/portfolio-context";
import { BacktestFilters } from "@/lib/types";

interface FilterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** "min" thresholds (require ≥ value) read as "Any" at their loosest — the min end. "max" thresholds (require ≤ value) read as "Any" at their loosest — the max end. */
  kind?: "min" | "max";
  onChange: (v: number) => void;
}

function FilterControl({ label, value, min, max, step = 1, suffix = "", kind = "min", onChange }: FilterControlProps) {
  const isAny = kind === "min" ? value <= min : value >= max;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">{isAny ? "Any" : `${value}${suffix}`}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)} />
    </div>
  );
}

type Mode = "screen" | "portfolio";

export default function BacktestingPage() {
  const [filters, setFilters] = useState<BacktestFilters>(DEFAULT_BACKTEST_FILTERS);
  const [activePreset, setActivePreset] = useState<string | null>(BACKTEST_PRESETS[0].id);
  const [mode, setMode] = useState<Mode>("screen");
  const { holdings } = usePaperPortfolio();

  const portfolioSymbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);
  const r = useMemo(
    () => (mode === "portfolio" ? runBacktestForSymbols(portfolioSymbols) : runBacktest(filters)),
    [mode, filters, portfolioSymbols]
  );

  const update = <K extends keyof BacktestFilters>(key: K, value: BacktestFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setActivePreset(null);
    setMode("screen");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Backtesting</h1>
        <p className="text-sm text-muted-foreground">
          Screen the tracked universe against your own criteria, or check how your Paper Portfolio holdings are actually performing.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("portfolio")}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
            mode === "portfolio" ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/40"
          )}
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="block font-medium text-foreground">My Paper Portfolio</span>
            <span className="block">{holdings.length} holding{holdings.length === 1 ? "" : "s"}</span>
          </span>
        </button>
        {BACKTEST_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setFilters(p.filters);
              setActivePreset(p.id);
              setMode("screen");
            }}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-xs transition-colors",
              mode === "screen" && p.id === activePreset
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            )}
          >
            <div className="font-medium text-foreground">{p.name}</div>
            <div className="mt-0.5 max-w-xs">{p.description}</div>
          </button>
        ))}
      </div>

      {mode === "portfolio" ? (
        <Card className="p-4 text-xs text-muted-foreground">
          Showing performance for the {holdings.length} compan{holdings.length === 1 ? "y" : "ies"} currently in your{" "}
          <Link href="/paper-portfolio" className="text-primary hover:underline">
            Paper Portfolio
          </Link>
          . Add or remove positions there and this updates automatically.
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Strategy Criteria</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setFilters(DEFAULT_BACKTEST_FILTERS);
                setActivePreset(BACKTEST_PRESETS[0].id);
              }}
            >
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <FilterControl
              label="Min revenue growth acceleration"
              value={filters.minRevenueAcceleration}
              min={-30}
              max={60}
              suffix="pp"
              onChange={(v) => update("minRevenueAcceleration", v)}
            />
            <FilterControl
              label="Min profit growth acceleration"
              value={filters.minProfitAcceleration}
              min={-40}
              max={80}
              suffix="pp"
              onChange={(v) => update("minProfitAcceleration", v)}
            />
            <FilterControl
              label="Min margin expansion"
              value={filters.minMarginExpansionBps}
              min={-400}
              max={800}
              step={25}
              suffix="bps"
              onChange={(v) => update("minMarginExpansionBps", v)}
            />
            <FilterControl label="Max PE" value={filters.maxPe} min={5} max={100} kind="max" onChange={(v) => update("maxPe", v)} suffix="x" />
            <FilterControl
              label="Max 6M price return (not yet priced in)"
              value={filters.max6mReturn}
              min={-30}
              max={100}
              kind="max"
              suffix="%"
              onChange={(v) => update("max6mReturn", v)}
            />
          </div>
        </Card>
      )}

      {r.signalCount === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {mode === "portfolio"
            ? "Your Paper Portfolio is empty — add a position there to see its performance here."
            : "No companies in the tracked universe match these criteria right now. Loosen the filters above to see results."}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Signals" value={r.signalCount.toLocaleString("en-IN")} />
            <StatCard label="Win rate" value={`${r.winRate}%`} valueClass="text-emerald-400" />
            <StatCard label="Avg return" value={formatPct(r.avgReturn)} valueClass={changeColorClass(r.avgReturn)} />
            <StatCard label="Median return" value={formatPct(r.medianReturn)} valueClass={changeColorClass(r.medianReturn)} />
            <StatCard label="Max drawdown" value={formatPct(r.maxDrawdown)} valueClass="text-rose-400" />
            <StatCard label="Avg holding" value={`${r.avgHoldingDays}d`} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="1M return" value={formatPct(r.return1m)} valueClass={changeColorClass(r.return1m)} />
            <StatCard label="3M return" value={formatPct(r.return3m)} valueClass={changeColorClass(r.return3m)} />
            <StatCard label="6M return" value={formatPct(r.return6m)} valueClass={changeColorClass(r.return6m)} />
            <StatCard label="12M return" value={formatPct(r.return12m)} valueClass={changeColorClass(r.return12m)} />
          </div>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Equity Curve</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Equal-weight average of the {r.signalCount.toLocaleString("en-IN")} matching companies&apos; own price history over the last{" "}
              {r.equityCurve.length} days.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={r.equityCurve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={12} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Matching Trades</h2>
              <span className="text-xs text-muted-foreground">
                Showing {r.trades.length.toLocaleString("en-IN")} of {r.signalCount.toLocaleString("en-IN")}, ranked by score
              </span>
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 pr-4 font-medium">Company</th>
                    <th className="py-1.5 pr-4 font-medium">Entry date</th>
                    <th className="py-1.5 pr-4 font-medium">Entry score</th>
                    <th className="py-1.5 pr-4 font-medium">1M</th>
                    <th className="py-1.5 pr-4 font-medium">3M</th>
                    <th className="py-1.5 pr-4 font-medium">6M</th>
                    <th className="py-1.5 pr-4 font-medium">12M</th>
                    <th className="py-1.5 pr-4 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {r.trades.map((t) => (
                    <tr key={t.symbol} className="border-b border-border/60">
                      <td className="py-1.5 pr-4">
                        {t.companyName} <span className="font-mono text-muted-foreground">({t.symbol})</span>
                      </td>
                      <td className="py-1.5 pr-4 font-mono">{formatDate(t.entryDate)}</td>
                      <td className="py-1.5 pr-4 font-mono">{t.entryScore}</td>
                      <td className={cn("py-1.5 pr-4 font-mono", changeColorClass(t.return1m))}>{formatPct(t.return1m)}</td>
                      <td className={cn("py-1.5 pr-4 font-mono", changeColorClass(t.return3m))}>{formatPct(t.return3m)}</td>
                      <td className={cn("py-1.5 pr-4 font-mono", changeColorClass(t.return6m))}>{formatPct(t.return6m)}</td>
                      <td className={cn("py-1.5 pr-4 font-mono", changeColorClass(t.return12m))}>{formatPct(t.return12m)}</td>
                      <td className="py-1.5 pr-4">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            t.outcome === "win" ? "bg-emerald-400/12 text-emerald-400" : "bg-rose-400/12 text-rose-400"
                          )}
                        >
                          {t.outcome === "win" ? "Win" : "Loss"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Card className="gap-1 p-3">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-lg font-semibold tabular-nums", valueClass)}>{value}</span>
    </Card>
  );
}
