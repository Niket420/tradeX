import type { Decimal } from "@/generated/prisma/runtime/library";

/**
 * Deterministic feature calculations over our own stored FinancialStatement
 * / PriceHistory rows — no external API calls, no scoring, no multibagger
 * logic. Computed on demand (see storage-approach note in the ingestion
 * report) rather than persisted, so results always reflect the latest
 * ingested data with no separate invalidation step.
 *
 * Every function returns null (never 0 or an extrapolated guess) when the
 * inputs needed for that specific calculation aren't available — e.g. no
 * prior-year quarter to compare against, or fewer than 365 days of price
 * history for a 1Y return.
 */

type Num = number | Decimal | null | undefined;

function toNumber(value: Num): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function percentChange(current: Num, previous: Num): number | null {
  const c = toNumber(current);
  const p = toNumber(previous);
  if (c === null || p === null || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function marginPct(numerator: Num, denominator: Num): number | null {
  const n = toNumber(numerator);
  const d = toNumber(denominator);
  if (n === null || d === null || d === 0) return null;
  return (n / d) * 100;
}

export interface FinancialStatementLike {
  period: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  periodType: "QUARTERLY" | "ANNUAL";
  revenue: Num;
  pat: Num;
  ebitda: Num;
  eps: Num;
  totalDebt: Num;
}

export interface FinancialGrowthFeatures {
  period: string;
  revenueQoQGrowthPct: number | null;
  revenueYoYGrowthPct: number | null;
  patQoQGrowthPct: number | null;
  patYoYGrowthPct: number | null;
  epsYoYGrowthPct: number | null;
  ebitdaMarginPct: number | null;
  ebitdaMarginChangePct: number | null;
  debtYoYGrowthPct: number | null;
}

/**
 * Computes growth/margin features for the most recent statement in
 * `statements` (any order) relative to the prior quarter (QoQ) and the same
 * quarter one fiscal year earlier (YoY). Only QUARTERLY periods are
 * compared against each other — mixing quarterly and annual periods would
 * silently produce a meaningless growth number.
 */
export function computeFinancialGrowth(statements: FinancialStatementLike[]): FinancialGrowthFeatures | null {
  const quarterly = statements.filter((s) => s.periodType === "QUARTERLY" && s.fiscalQuarter !== null).sort((a, b) => a.fiscalYear - b.fiscalYear || (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0));

  if (quarterly.length === 0) return null;
  const latest = quarterly[quarterly.length - 1];

  const priorQuarter = quarterly[quarterly.length - 2];
  const priorYear = quarterly.find((s) => s.fiscalYear === latest.fiscalYear - 1 && s.fiscalQuarter === latest.fiscalQuarter);

  const latestEbitdaMargin = marginPct(latest.ebitda, latest.revenue);
  const priorEbitdaMargin = priorQuarter ? marginPct(priorQuarter.ebitda, priorQuarter.revenue) : null;

  return {
    period: latest.period,
    revenueQoQGrowthPct: priorQuarter ? percentChange(latest.revenue, priorQuarter.revenue) : null,
    revenueYoYGrowthPct: priorYear ? percentChange(latest.revenue, priorYear.revenue) : null,
    patQoQGrowthPct: priorQuarter ? percentChange(latest.pat, priorQuarter.pat) : null,
    patYoYGrowthPct: priorYear ? percentChange(latest.pat, priorYear.pat) : null,
    epsYoYGrowthPct: priorYear ? percentChange(latest.eps, priorYear.eps) : null,
    ebitdaMarginPct: latestEbitdaMargin,
    ebitdaMarginChangePct: latestEbitdaMargin !== null && priorEbitdaMargin !== null ? latestEbitdaMargin - priorEbitdaMargin : null,
    debtYoYGrowthPct: priorYear ? percentChange(latest.totalDebt, priorYear.totalDebt) : null,
  };
}

export interface PriceHistoryLike {
  date: Date;
  close: Num;
  high: Num;
  volume: bigint | number;
}

export interface PriceReturnFeatures {
  asOfDate: string;
  latestClose: number | null;
  return1D: number | null;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  volumeChange1DPct: number | null;
  distanceFrom52WeekHighPct: number | null;
}

/** Finds the closing price on the trading day on-or-before `targetDate`, searching back at most `maxLookbackDays`. */
function closeOnOrBefore(sortedDesc: PriceHistoryLike[], targetDate: Date, maxLookbackDays: number): number | null {
  const cutoff = new Date(targetDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - maxLookbackDays);
  const row = sortedDesc.find((r) => r.date <= targetDate && r.date >= cutoff);
  return row ? toNumber(row.close) : null;
}

/**
 * Computes trailing price returns as of the most recent price row. Each
 * horizon independently returns null if there isn't a trading day within a
 * reasonable lookback window of that target date — e.g. a 1Y return needs a
 * price from ~365 days ago; if we've only ingested 30 days of history,
 * return1Y is null rather than computed from whatever's available.
 */
export function computePriceReturns(rows: PriceHistoryLike[]): PriceReturnFeatures | null {
  if (rows.length === 0) return null;
  const sortedDesc = [...rows].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latest = sortedDesc[0];
  const latestClose = toNumber(latest.close);
  const asOf = latest.date;

  const at = (daysAgo: number, lookback: number) => {
    const target = new Date(asOf);
    target.setUTCDate(target.getUTCDate() - daysAgo);
    return closeOnOrBefore(sortedDesc.slice(1), target, lookback);
  };

  const prevDayVolume = sortedDesc[1] ? Number(sortedDesc[1].volume) : null;
  const latestVolume = Number(latest.volume);

  const high52w = rows
    .filter((r) => r.date >= new Date(asOf.getTime() - 365 * 24 * 60 * 60 * 1000))
    .map((r) => toNumber(r.high))
    .filter((h): h is number => h !== null);
  const max52wHigh = high52w.length > 0 ? Math.max(...high52w) : null;

  return {
    asOfDate: asOf.toISOString().slice(0, 10),
    latestClose,
    return1D: percentChange(latestClose, at(1, 4)),
    return1W: percentChange(latestClose, at(7, 4)),
    return1M: percentChange(latestClose, at(30, 7)),
    return3M: percentChange(latestClose, at(90, 10)),
    return6M: percentChange(latestClose, at(182, 10)),
    return1Y: percentChange(latestClose, at(365, 14)),
    volumeChange1DPct: prevDayVolume ? percentChange(latestVolume, prevDayVolume) : null,
    distanceFrom52WeekHighPct: max52wHigh !== null && latestClose !== null ? ((latestClose - max52wHigh) / max52wHigh) * 100 : null,
  };
}
