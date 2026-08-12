import { generateCompany } from "@/lib/mock/generate-company";
import { REAL_COMPANY_SEEDS } from "@/lib/mock/real-companies-seed";
import { Rng, round } from "@/lib/mock/rng";
import {
  Alert,
  BacktestResult,
  Company,
  PaperPortfolio,
  SECTORS,
  Sector,
  SectorSummary,
} from "@/lib/types";

export const TODAY = "2026-08-12";

export const companies: Company[] = REAL_COMPANY_SEEDS.map((seed, i) => generateCompany(seed, i));

// Real count of merged NSE+BSE listings — see scripts/build-universe.mjs.
export const TOTAL_COMPANIES_TRACKED = companies.length;

// Assign peers within the same sector now that all companies exist.
// Grouped once up front — filtering the full array per company is O(n^2) and not viable at 5k+ rows.
const companiesBySector = new Map<string, Company[]>();
for (const company of companies) {
  const list = companiesBySector.get(company.sector);
  if (list) list.push(company);
  else companiesBySector.set(company.sector, [company]);
}
for (const company of companies) {
  const sectorPeers = companiesBySector.get(company.sector) ?? [];
  const peers: string[] = [];
  for (const c of sectorPeers) {
    if (c.symbol === company.symbol) continue;
    peers.push(c.symbol);
    if (peers.length === 4) break;
  }
  company.peers = peers;
}

const companyBySymbol = new Map(companies.map((c) => [c.symbol, c]));

export function getCompany(symbol: string): Company | undefined {
  return companyBySymbol.get(symbol.toUpperCase());
}

// ---------- Dashboard aggregates ----------

export const dashboardStats = {
  totalCompaniesTracked: TOTAL_COMPANIES_TRACKED,
  positiveEarningsAcceleration: companies.filter((c) => c.scores.earningsAcceleration >= 60).length,
  acceleratingRevenue: companies.filter(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY > c.quarterlyHistory[0].revenueGrowthYoY + 5
  ).length,
  acceleratingProfit: companies.filter(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].profitGrowthYoY > c.quarterlyHistory[0].profitGrowthYoY + 8
  ).length,
  marginExpansion: companies.filter(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin > c.quarterlyHistory[c.quarterlyHistory.length - 2].ebitdaMargin + 0.5
  ).length,
  positiveEarningsSurprises: companies.filter((c) => c.earnings.profitSurprisePct > 8).length,
  unusualVolume: companies.filter((c) => Math.abs(c.change1d) > 3).length,
  newMultibaggerEntrants: companies.filter((c) => c.scores.multibagger >= 70 && c.previousScores.multibagger < 70).length,
};

function sparkFor(seedKey: string, points = 14, trendUp = true): number[] {
  const rng = new Rng(seedKey);
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    v += (trendUp ? 1 : -1) * rng.range(0, 3) + rng.noise(2);
    out.push(round(Math.max(v, 2), 1));
  }
  return out;
}

export const dashboardSparklines = {
  totalCompaniesTracked: sparkFor("spark-total", 14, true),
  positiveEarningsAcceleration: sparkFor("spark-earn-accel", 14, true),
  acceleratingRevenue: sparkFor("spark-rev-accel", 14, true),
  acceleratingProfit: sparkFor("spark-profit-accel", 14, true),
  marginExpansion: sparkFor("spark-margin", 14, true),
  positiveEarningsSurprises: sparkFor("spark-surprise", 14, false),
  unusualVolume: sparkFor("spark-volume", 14, false),
  newMultibaggerEntrants: sparkFor("spark-multibagger", 14, true),
};

export const emergingSignals = companies
  .flatMap((c) => c.signals.map((s) => ({ company: c, signal: s })))
  .sort((a, b) => {
    const sevRank = { high: 0, medium: 1, low: 2 };
    return sevRank[a.signal.severity] - sevRank[b.signal.severity];
  })
  .slice(0, 16);

export const biggestFundamentalChanges = [...companies]
  .sort((a, b) => b.scores.multibagger - b.previousScores.multibagger - (a.scores.multibagger - a.previousScores.multibagger))
  .slice(0, 12);

// ---------- Emerging Opportunities ----------

export const emergingOpportunities = [...companies]
  .map((c) => ({
    company: c,
    scoreChange: c.scores.multibagger - c.previousScores.multibagger,
  }))
  .filter((x) => x.scoreChange > 0)
  .sort((a, b) => b.scoreChange - a.scoreChange);

// ---------- Multibagger Radar ----------

export const multibaggerRadar = [...companies].sort((a, b) => b.scores.multibagger - a.scores.multibagger);

// ---------- Sector Intelligence ----------

export const sectorSummaries: SectorSummary[] = SECTORS.map((sector) => {
  const list = companies.filter((c) => c.sector === sector);
  const avg = (fn: (c: Company) => number) => (list.length ? list.reduce((s, c) => s + fn(c), 0) / list.length : 0);
  const avgRevenueGrowth = avg((c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY);
  const avgProfitGrowth = avg((c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].profitGrowthYoY);
  const avgMargin = avg((c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin);
  const avgMarginChange = avg(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin - c.quarterlyHistory[0].ebitdaMargin
  );
  const accelerating = list.filter(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].profitGrowthYoY > c.quarterlyHistory[0].profitGrowthYoY + 8
  ).length;
  const decelerating = list.filter(
    (c) => c.quarterlyHistory[c.quarterlyHistory.length - 1].profitGrowthYoY < c.quarterlyHistory[0].profitGrowthYoY - 8
  ).length;
  return {
    sector,
    companyCount: list.length,
    avgChange1m: round(avg((c) => c.change1m)),
    avgRevenueGrowth: round(avgRevenueGrowth),
    avgProfitGrowth: round(avgProfitGrowth),
    avgMargin: round(avgMargin),
    avgMarginChange: round(avgMarginChange),
    avgPe: round(avg((c) => c.pe)),
    accelerating,
    decelerating,
    positiveSurprises: list.filter((c) => c.earnings.profitSurprisePct > 8).length,
    emergingScore: round(avg((c) => c.scores.multibagger)),
  };
}).filter((s) => s.companyCount > 0);

export const emergingSectors = [...sectorSummaries].sort((a, b) => b.avgMarginChange + b.accelerating - (a.avgMarginChange + a.accelerating)).slice(0, 5);

// ---------- Alerts ----------

export const alerts: Alert[] = companies
  .flatMap((c) =>
    c.signals.map((s, idx) => ({
      id: `${c.symbol}-alert-${idx}`,
      symbol: c.symbol,
      companyName: c.name,
      type: s.type,
      message: `${c.name}: ${s.detail}`,
      severity: s.severity,
      timestamp: shiftFromToday((idx + 1) * 3 + (c.symbol.charCodeAt(0) % 5)),
    }))
  )
  .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

function shiftFromToday(hoursAgo: number): string {
  const d = new Date("2026-08-12T15:30:00Z");
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

// ---------- Earnings Radar ----------

export const upcomingResults = companies.filter((c) => c.earnings.status === "upcoming").sort((a, b) => (a.earnings.resultDate < b.earnings.resultDate ? -1 : 1));
export const resultsToday = companies.filter((c) => c.earnings.status === "today");
export const resultsThisWeek = companies.filter((c) => c.earnings.status === "this_week").sort((a, b) => (a.earnings.resultDate > b.earnings.resultDate ? -1 : 1));
export const resultsReleased = companies.filter((c) => c.earnings.status === "released" || c.earnings.status === "this_week" || c.earnings.status === "today");

// ---------- Earnings Surprises ----------

export const earningsSurprises = [...companies]
  .filter((c) => c.earnings.status !== "upcoming")
  .sort((a, b) => b.earnings.profitSurprisePct - a.earnings.profitSurprisePct);

// ---------- Lens pages ----------

export const growthAcceleration = [...companies].sort((a, b) => b.scores.earningsAcceleration - a.scores.earningsAcceleration);
export const marginExpansionLeaders = [...companies].sort(
  (a, b) =>
    b.quarterlyHistory[b.quarterlyHistory.length - 1].ebitdaMargin -
    b.quarterlyHistory[0].ebitdaMargin -
    (a.quarterlyHistory[a.quarterlyHistory.length - 1].ebitdaMargin - a.quarterlyHistory[0].ebitdaMargin)
);
export const orderBookRadar = [...companies].sort((a, b) => b.orderBookGrowthPct - a.orderBookGrowthPct);
export const momentumLeaders = [...companies].sort((a, b) => b.scores.momentum - a.scores.momentum);
export const valuationLens = [...companies].sort((a, b) => b.scores.valuation - a.scores.valuation);

// ---------- Market status ----------

export const marketStatus = {
  nifty: { value: 26842.35, change: 0.64 },
  sensex: { value: 87921.4, change: 0.58 },
  isOpen: true,
};

// ---------- Watchlist (default) ----------

export const defaultWatchlist = multibaggerRadar.slice(0, 8).map((c) => c.symbol);

// ---------- Paper portfolio (default mock state) ----------

const PAPER_HOLDING_TEMPLATES = [
  { entryDate: "2026-04-14", quantity: 120, signal: "Multibagger Radar entry", reason: "Revenue + profit acceleration with order book growth" },
  { entryDate: "2026-03-02", quantity: 85, signal: "Margin expansion", reason: "EBITDA margin expanded 400+ bps over 3 quarters" },
  { entryDate: "2026-05-21", quantity: 200, signal: "Order book radar", reason: "Order book up 60%+ YoY, institutional accumulation" },
  { entryDate: "2026-06-09", quantity: 45, signal: "Earnings acceleration", reason: "Three consecutive quarters of profit acceleration" },
];

export const paperPortfolio: PaperPortfolio = {
  capital: 1000000,
  cash: 214500,
  holdings: multibaggerRadar.slice(8, 12).map((c, i) => {
    const template = PAPER_HOLDING_TEMPLATES[i];
    const entryPrice = round(c.price / (1 + c.change6m / 100), 2);
    return { symbol: c.symbol, companyName: c.name, entryPrice, currentPrice: c.price, score: c.scores.multibagger, ...template };
  }),
};

// ---------- Backtesting (mock) ----------

function buildBacktestResult(seedKey: string, strengthBias: number): BacktestResult {
  const rng = new Rng(seedKey);
  const signalCount = rng.int(38, 140);
  const winRate = round(clampPct(52 + strengthBias * 14 + rng.noise(6)));
  const avgReturn = round(18 + strengthBias * 22 + rng.noise(8));
  const medianReturn = round(avgReturn * rng.range(0.75, 0.95));
  const maxDrawdown = round(-(14 + rng.range(0, 16)));
  const avgHoldingDays = rng.int(90, 260);
  const equityCurve: { date: string; value: number }[] = [];
  let value = 100;
  const start = new Date("2023-08-01T00:00:00Z");
  for (let i = 0; i < 36; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    value = value * (1 + (avgReturn / 36 / 100) + rng.noise(0.035));
    equityCurve.push({ date: d.toISOString().slice(0, 7), value: round(value, 2) });
  }
  const pool = [...companies].sort((a, b) => b.scores.multibagger - a.scores.multibagger).slice(0, 10);
  const trades = pool.map((c) => {
    const r12 = round(c.change1y * rng.range(0.6, 1.3) + strengthBias * 20 + rng.noise(6));
    return {
      symbol: c.symbol,
      companyName: c.name,
      entryDate: shiftFromToday(rng.int(60, 700) * 24).slice(0, 10),
      entryScore: c.previousScores.multibagger,
      return1m: round(r12 * 0.12 + rng.noise(3)),
      return3m: round(r12 * 0.35 + rng.noise(4)),
      return6m: round(r12 * 0.6 + rng.noise(5)),
      return12m: r12,
      outcome: (r12 > 0 ? "win" : "loss") as "win" | "loss",
    };
  });
  return {
    signalCount,
    winRate,
    avgReturn,
    medianReturn,
    maxDrawdown,
    avgHoldingDays,
    return1m: round(avgReturn * 0.1 + rng.noise(2)),
    return3m: round(avgReturn * 0.32 + rng.noise(3)),
    return6m: round(avgReturn * 0.58 + rng.noise(4)),
    return12m: round(avgReturn * 0.95 + rng.noise(5)),
    equityCurve,
    trades,
  };
}

function clampPct(v: number) {
  return Math.max(30, Math.min(85, v));
}

export const backtestPresets = [
  {
    id: "acceleration-classic",
    name: "Growth + Margin Acceleration",
    description: "Revenue growth accel > 20%, profit growth accel > 30%, margin expansion > 200bps, PE < 40, 6M return < 20%",
    result: buildBacktestResult("backtest-1", 1),
  },
  {
    id: "earnings-surprise",
    name: "Earnings Surprise Momentum",
    description: "Profit surprise > 15%, stock reaction < 10% (not yet priced in), institutional buying present",
    result: buildBacktestResult("backtest-2", 0.6),
  },
  {
    id: "order-book",
    name: "Order Book Expansion",
    description: "Order book growth > 30% YoY, debt reduction, reasonable valuation (PE < 30)",
    result: buildBacktestResult("backtest-3", 0.8),
  },
  {
    id: "quality-only",
    name: "Pure Quality (control)",
    description: "Quality score > 80 regardless of change signals — used as a baseline comparison",
    result: buildBacktestResult("backtest-4", 0.15),
  },
];

export { SECTORS };
export type { Sector };
