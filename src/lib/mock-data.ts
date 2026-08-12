import { generateCompany } from "@/lib/mock/generate-company";
import { REAL_COMPANY_SEEDS } from "@/lib/mock/real-companies-seed";
import { Rng, round } from "@/lib/mock/rng";
import {
  Alert,
  BacktestFilters,
  BacktestResult,
  BacktestTrade,
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

// ---------- Backtesting ----------
//
// Runs live against the current tracked universe: a company "signals" if its own
// quarterly trend and valuation satisfy the given filters, and its outcome is that
// company's own change6m/change1y/priceHistory. This is a screen-and-simulate over
// today's mock universe, not a true point-in-time historical backtest — the mock data
// only carries one current+previous quarter snapshot per company, not dated historical
// snapshots to re-run the screen against past dates.

function meanOf(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function medianOf(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Rough interpolation for a 3-month return between the 1M and 6M fields every company already carries.
function approx3mReturn(c: Company): number {
  return c.change1m + (c.change6m - c.change1m) * 0.4;
}

function matchesBacktestFilters(c: Company, f: BacktestFilters): boolean {
  const h = c.quarterlyHistory;
  const latest = h[h.length - 1];
  const first = h[0];
  const revenueAcceleration = latest.revenueGrowthYoY - first.revenueGrowthYoY;
  const profitAcceleration = latest.profitGrowthYoY - first.profitGrowthYoY;
  const marginExpansionBps = (latest.ebitdaMargin - first.ebitdaMargin) * 100;
  return (
    revenueAcceleration >= f.minRevenueAcceleration &&
    profitAcceleration >= f.minProfitAcceleration &&
    marginExpansionBps >= f.minMarginExpansionBps &&
    c.pe <= f.maxPe &&
    c.change6m <= f.max6mReturn
  );
}

const EMPTY_BACKTEST_RESULT: BacktestResult = {
  signalCount: 0,
  winRate: 0,
  avgReturn: 0,
  medianReturn: 0,
  maxDrawdown: 0,
  avgHoldingDays: 0,
  return1m: 0,
  return3m: 0,
  return6m: 0,
  return12m: 0,
  equityCurve: [],
  trades: [],
};

export function screenCompanies(filters: BacktestFilters): Company[] {
  return companies.filter((c) => matchesBacktestFilters(c, filters));
}

function aggregateBacktestResult(matches: Company[]): BacktestResult {
  const signalCount = matches.length;
  if (signalCount === 0) return EMPTY_BACKTEST_RESULT;

  const returns1y = matches.map((c) => c.change1y);
  const wins = matches.filter((c) => c.change1y > 0).length;

  // Equal-weight equity curve built from each matched company's own daily price history.
  const pointCount = matches[0].priceHistory.length;
  const equityCurve = matches[0].priceHistory.map((point, i) => {
    const avgIndexed = meanOf(matches.map((c) => c.priceHistory[i].price / c.priceHistory[0].price));
    return { date: point.date, value: round(avgIndexed * 100, 2) };
  });
  let peak = equityCurve[0]?.value ?? 100;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.value);
    maxDrawdown = Math.min(maxDrawdown, ((point.value - peak) / peak) * 100);
  }

  const trades: BacktestTrade[] = [...matches]
    .sort((a, b) => b.scores.multibagger - a.scores.multibagger)
    .slice(0, 150)
    .map((c) => ({
      symbol: c.symbol,
      companyName: c.name,
      entryDate: c.priceHistory[0].date,
      entryScore: c.previousScores.multibagger,
      return1m: c.change1m,
      return3m: round(approx3mReturn(c)),
      return6m: c.change6m,
      return12m: c.change1y,
      outcome: c.change1y > 0 ? "win" : "loss",
    }));

  return {
    signalCount,
    winRate: round((wins / signalCount) * 100),
    avgReturn: round(meanOf(returns1y)),
    medianReturn: round(medianOf(returns1y)),
    maxDrawdown: round(maxDrawdown),
    avgHoldingDays: Math.round(pointCount * (1 + signalCount / (companies.length || 1)) * 2),
    return1m: round(meanOf(matches.map((c) => c.change1m))),
    return3m: round(meanOf(matches.map(approx3mReturn))),
    return6m: round(meanOf(matches.map((c) => c.change6m))),
    return12m: round(meanOf(returns1y)),
    equityCurve,
    trades,
  };
}

export function runBacktest(filters: BacktestFilters): BacktestResult {
  return aggregateBacktestResult(screenCompanies(filters));
}

// Backtests the caller's actual set of holdings (e.g. the Paper Portfolio) rather than a
// threshold screen — so whatever a user has added there shows up here too.
export function runBacktestForSymbols(symbols: string[]): BacktestResult {
  const symbolSet = new Set(symbols);
  const matches = companies.filter((c) => symbolSet.has(c.symbol));
  return aggregateBacktestResult(matches);
}

export const BACKTEST_PRESETS: { id: string; name: string; description: string; filters: BacktestFilters }[] = [
  {
    id: "acceleration-classic",
    name: "Growth + Margin Acceleration",
    description: "Revenue growth accel ≥ 20pp, profit growth accel ≥ 30pp, margin expansion ≥ 200bps, PE ≤ 40, 6M return ≤ 20%",
    filters: { minRevenueAcceleration: 20, minProfitAcceleration: 30, minMarginExpansionBps: 200, maxPe: 40, max6mReturn: 20 },
  },
  {
    id: "deep-value-turnaround",
    name: "Deep Value Turnaround",
    description: "Modest acceleration required, but cheap: PE ≤ 18, limited prior run-up",
    filters: { minRevenueAcceleration: 5, minProfitAcceleration: 10, minMarginExpansionBps: 100, maxPe: 18, max6mReturn: 10 },
  },
  {
    id: "high-conviction",
    name: "High Conviction Only",
    description: "Strict thresholds across every dimension — fewer signals, higher bar",
    filters: { minRevenueAcceleration: 25, minProfitAcceleration: 40, minMarginExpansionBps: 300, maxPe: 30, max6mReturn: 12 },
  },
  {
    id: "broad-screen",
    name: "Broad Screen (control)",
    description: "Loose thresholds — used as a baseline to see how much the strict filters actually add",
    filters: { minRevenueAcceleration: -30, minProfitAcceleration: -40, minMarginExpansionBps: -400, maxPe: 100, max6mReturn: 100 },
  },
];

export const DEFAULT_BACKTEST_FILTERS: BacktestFilters = BACKTEST_PRESETS[0].filters;

export { SECTORS };
export type { Sector };
