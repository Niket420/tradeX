export const SECTORS = [
  "IT",
  "Banks",
  "Financial Services",
  "Pharma",
  "Healthcare",
  "Auto",
  "Auto Components",
  "Capital Goods",
  "Defence",
  "Railways",
  "Renewables",
  "Power",
  "Chemicals",
  "Specialty Chemicals",
  "Consumer",
  "FMCG",
  "Real Estate",
  "Telecom",
  "Infrastructure",
  "Metals",
  "Mining",
  "Textiles",
] as const;

export type Sector = (typeof SECTORS)[number];

export type Archetype =
  | "emerging_multibagger"
  | "quality_compounder"
  | "decelerating"
  | "surprise_priced_in"
  | "value_turnaround"
  | "momentum_high_pe"
  | "steady_large_cap"
  | "cyclical_recovery"
  | "decliner"
  | "early_accelerator";

export type MarketCapTier = "large" | "mid" | "small" | "micro";

export interface QuarterlyMetric {
  quarter: string;
  revenueCr: number;
  revenueGrowthYoY: number;
  profitCr: number;
  profitGrowthYoY: number;
  ebitdaMargin: number;
  roce: number;
  roe: number;
  debtCr: number;
  operatingCashFlowCr: number;
}

export interface Scores {
  quality: number;
  growth: number;
  earningsAcceleration: number;
  marginExpansion: number;
  earningsSurprise: number;
  valuation: number;
  momentum: number;
  institutionalActivity: number;
  orderBook: number;
  multibagger: number;
}

export type SignalType =
  | "revenue_acceleration"
  | "profit_acceleration"
  | "margin_expansion"
  | "earnings_surprise"
  | "large_order"
  | "institutional_buying"
  | "institutional_selling"
  | "score_up"
  | "score_down"
  | "debt_reduction"
  | "unusual_volume"
  | "promoter_buying"
  | "promoter_selling";

export type Severity = "high" | "medium" | "low";

export interface Signal {
  id: string;
  type: SignalType;
  label: string;
  detail: string;
  severity: Severity;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Shareholding {
  promoter: number;
  promoterChange: number;
  fii: number;
  fiiChange: number;
  dii: number;
  diiChange: number;
  public: number;
}

export interface EarningsRecord {
  resultDate: string;
  quarter: string;
  expectedRevenueCr: number;
  actualRevenueCr: number;
  revenueSurprisePct: number;
  expectedProfitCr: number;
  actualProfitCr: number;
  profitSurprisePct: number;
  expectedEps: number;
  actualEps: number;
  epsSurprisePct: number;
  marginSurprisePct: number;
  stockReactionPct: number;
  priorRunUp3mPct: number;
  guidance: string;
  status: "upcoming" | "today" | "this_week" | "released";
}

export interface NewsItem {
  date: string;
  headline: string;
  category: "results" | "order" | "management" | "institutional" | "general";
}

export interface Alert {
  id: string;
  symbol: string;
  companyName: string;
  type: SignalType;
  message: string;
  severity: Severity;
  timestamp: string;
}

export interface SectorSummary {
  sector: Sector;
  companyCount: number;
  avgChange1m: number;
  avgRevenueGrowth: number;
  avgProfitGrowth: number;
  avgMargin: number;
  avgMarginChange: number;
  avgPe: number;
  accelerating: number;
  decelerating: number;
  positiveSurprises: number;
  emergingScore: number;
}

export interface BacktestFilters {
  minRevenueAcceleration: number;
  minProfitAcceleration: number;
  minMarginExpansionBps: number;
  maxPe: number;
  max6mReturn: number;
}

export interface BacktestTrade {
  symbol: string;
  companyName: string;
  entryDate: string;
  entryScore: number;
  return1m: number;
  return3m: number;
  return6m: number;
  return12m: number;
  outcome: "win" | "loss";
}

export interface BacktestResult {
  signalCount: number;
  winRate: number;
  avgReturn: number;
  medianReturn: number;
  maxDrawdown: number;
  avgHoldingDays: number;
  return1m: number;
  return3m: number;
  return6m: number;
  return12m: number;
  equityCurve: { date: string; value: number }[];
  trades: BacktestTrade[];
}

export interface PaperHolding {
  symbol: string;
  companyName: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  signal: string;
  score: number;
  reason: string;
}

export interface PaperPortfolio {
  capital: number;
  cash: number;
  holdings: PaperHolding[];
}

export interface Company {
  id: string;
  symbol: string;
  name: string;
  sector: Sector;
  industry: string;
  archetype: Archetype;
  marketCapTier: MarketCapTier;
  marketCapCr: number;
  price: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change6m: number;
  change1y: number;
  pe: number;
  debtToEquity: number;
  orderBookGrowthPct: number;
  quarterlyHistory: QuarterlyMetric[];
  scores: Scores;
  previousScores: Scores;
  signals: Signal[];
  priceHistory: PricePoint[];
  shareholding: Shareholding;
  earnings: EarningsRecord;
  news: NewsItem[];
  peers: string[];
  aiThesis: string;
  businessOverview: string;
  riskFactors: string[];
  managementGuidance: string;
}
