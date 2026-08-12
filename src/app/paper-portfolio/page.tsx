"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR, formatPct, formatPrice, formatDate, changeColorClass } from "@/lib/format";
import { paperPortfolio as initialPortfolio, multibaggerRadar, getCompany } from "@/lib/mock-data";
import { round } from "@/lib/mock/rng";
import { cn } from "@/lib/utils";

const NIFTY_RETURN_PCT = 9.8;

export default function PaperPortfolioPage() {
  const [holdings, setHoldings] = useState(initialPortfolio.holdings);
  const [candidateSymbol, setCandidateSymbol] = useState("");

  const heldSymbols = new Set(holdings.map((h) => h.symbol));
  const candidates = multibaggerRadar.filter((c) => !heldSymbols.has(c.symbol)).slice(0, 25);

  const stats = useMemo(() => {
    const invested = holdings.reduce((s, h) => s + h.entryPrice * h.quantity, 0);
    const currentValue = holdings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    const pnl = currentValue - invested;
    const portfolioReturn = invested > 0 ? round((pnl / invested) * 100) : 0;
    const wins = holdings.filter((h) => h.currentPrice >= h.entryPrice).length;
    const winRate = holdings.length ? round((wins / holdings.length) * 100) : 0;
    return {
      invested,
      currentValue,
      pnl,
      portfolioReturn,
      winRate,
      alpha: round(portfolioReturn - NIFTY_RETURN_PCT),
    };
  }, [holdings]);

  const cash = initialPortfolio.capital - stats.invested;

  function addHolding() {
    const c = getCompany(candidateSymbol);
    if (!c) return;
    const entryPrice = round(c.price / (1 + c.change1m / 100), 2);
    setHoldings((h) => [
      ...h,
      {
        symbol: c.symbol,
        companyName: c.name,
        entryDate: "2026-08-12",
        entryPrice,
        currentPrice: c.price,
        quantity: Math.max(1, Math.round(20000 / c.price)),
        signal: "Multibagger Radar entry",
        score: c.scores.multibagger,
        reason: `Added from Multibagger Radar — score ${c.scores.multibagger}`,
      },
    ]);
    setCandidateSymbol("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Paper Portfolio</h1>
        <p className="text-sm text-muted-foreground">A simulated portfolio for tracking whether signals actually translate into returns.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Capital" value={formatINR(initialPortfolio.capital)} />
        <StatCard label="Invested" value={formatINR(stats.invested)} />
        <StatCard label="Cash" value={formatINR(cash)} />
        <StatCard label="P&L" value={formatINR(stats.pnl)} valueClass={changeColorClass(stats.pnl)} />
        <StatCard label="Win rate" value={`${stats.winRate}%`} valueClass="text-emerald-400" />
        <StatCard label="Portfolio return" value={formatPct(stats.portfolioReturn)} valueClass={changeColorClass(stats.portfolioReturn)} />
        <StatCard label="NIFTY return" value={formatPct(NIFTY_RETURN_PCT)} valueClass="text-muted-foreground" />
        <StatCard label="Alpha" value={formatPct(stats.alpha)} valueClass={changeColorClass(stats.alpha)} />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-sm font-medium">Add a position from a signal</span>
        <div className="flex items-center gap-2">
          <Select value={candidateSymbol} onValueChange={(v) => setCandidateSymbol(v ?? "")}>
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue placeholder="Select a company..." />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.symbol} value={c.symbol}>
                  {c.name} — score {c.scores.multibagger}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 gap-1.5" disabled={!candidateSymbol} onClick={addHolding}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Holdings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Company</th>
                <th className="py-1.5 pr-4 font-medium">Entry date</th>
                <th className="py-1.5 pr-4 font-medium">Entry price</th>
                <th className="py-1.5 pr-4 font-medium">Current price</th>
                <th className="py-1.5 pr-4 font-medium">Qty</th>
                <th className="py-1.5 pr-4 font-medium">Return</th>
                <th className="py-1.5 pr-4 font-medium">Signal</th>
                <th className="py-1.5 pr-4 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const ret = round(((h.currentPrice - h.entryPrice) / h.entryPrice) * 100);
                return (
                  <tr key={h.symbol} className="border-b border-border/60">
                    <td className="py-1.5 pr-4">
                      {h.companyName} <span className="font-mono text-muted-foreground">({h.symbol})</span>
                    </td>
                    <td className="py-1.5 pr-4 font-mono">{formatDate(h.entryDate)}</td>
                    <td className="py-1.5 pr-4 font-mono">{formatPrice(h.entryPrice)}</td>
                    <td className="py-1.5 pr-4 font-mono">{formatPrice(h.currentPrice)}</td>
                    <td className="py-1.5 pr-4 font-mono">{h.quantity}</td>
                    <td className={cn("py-1.5 pr-4 font-mono", changeColorClass(ret))}>{formatPct(ret)}</td>
                    <td className="py-1.5 pr-4">{h.signal}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{h.reason}</td>
                  </tr>
                );
              })}
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
      <span className={cn("font-mono text-base font-semibold tabular-nums", valueClass)}>{value}</span>
    </Card>
  );
}
