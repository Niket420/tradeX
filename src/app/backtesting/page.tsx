"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPct, changeColorClass, formatDate } from "@/lib/format";
import { backtestPresets } from "@/lib/mock-data";

export default function BacktestingPage() {
  const [presetId, setPresetId] = useState(backtestPresets[0].id);
  const preset = backtestPresets.find((p) => p.id === presetId) ?? backtestPresets[0];
  const r = preset.result;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Backtesting</h1>
        <p className="text-sm text-muted-foreground">Test signal strategies historically before trusting them going forward.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {backtestPresets.map((p) => (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-xs transition-colors",
              p.id === presetId ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            )}
          >
            <div className="font-medium text-foreground">{p.name}</div>
            <div className="mt-0.5 max-w-xs">{p.description}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Signals" value={r.signalCount.toString()} />
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
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={r.equityCurve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={5} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Sample Trades</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
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
