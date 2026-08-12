import {
  Archetype,
  Company,
  EarningsRecord,
  MarketCapTier,
  NewsItem,
  PricePoint,
  QuarterlyMetric,
  Scores,
  Sector,
  Shareholding,
  Signal,
} from "@/lib/types";
import { clamp, round, Rng } from "@/lib/mock/rng";

export interface CompanySeed {
  symbol: string;
  name: string;
  sector: Sector;
  industry: string;
  archetype: Archetype;
  marketCapTier: MarketCapTier;
}

interface ArchetypeProfile {
  revGrowth: [number, number];
  revCurve: "accelerating" | "decelerating" | "linear" | "flat";
  profitGrowth: [number, number];
  profitCurve: "accelerating" | "decelerating" | "linear" | "flat";
  marginRange: [number, number];
  marginCurve: "accelerating" | "decelerating" | "linear" | "flat";
  priceRun6m: [number, number];
  priceRun1y: [number, number];
  peRange: [number, number];
  debtTrend: "down" | "flat" | "up";
  institutionalTrend: "up" | "down" | "flat";
  orderBookGrowth: [number, number];
  qualityBase: [number, number];
}

const PROFILES: Record<Archetype, ArchetypeProfile> = {
  emerging_multibagger: {
    revGrowth: [12, 41],
    revCurve: "accelerating",
    profitGrowth: [8, 79],
    profitCurve: "accelerating",
    marginRange: [11, 20],
    marginCurve: "accelerating",
    priceRun6m: [2, 16],
    priceRun1y: [8, 28],
    peRange: [14, 32],
    debtTrend: "down",
    institutionalTrend: "up",
    orderBookGrowth: [25, 70],
    qualityBase: [45, 65],
  },
  early_accelerator: {
    revGrowth: [9, 33],
    revCurve: "accelerating",
    profitGrowth: [5, 58],
    profitCurve: "accelerating",
    marginRange: [9, 16],
    marginCurve: "accelerating",
    priceRun6m: [-4, 10],
    priceRun1y: [-6, 14],
    peRange: [12, 26],
    debtTrend: "down",
    institutionalTrend: "up",
    orderBookGrowth: [15, 55],
    qualityBase: [38, 58],
  },
  quality_compounder: {
    revGrowth: [14, 24],
    revCurve: "linear",
    profitGrowth: [15, 28],
    profitCurve: "linear",
    marginRange: [22, 32],
    marginCurve: "linear",
    priceRun6m: [10, 26],
    priceRun1y: [22, 48],
    peRange: [35, 62],
    debtTrend: "flat",
    institutionalTrend: "up",
    orderBookGrowth: [5, 20],
    qualityBase: [78, 94],
  },
  steady_large_cap: {
    revGrowth: [7, 14],
    revCurve: "flat",
    profitGrowth: [6, 15],
    profitCurve: "flat",
    marginRange: [18, 26],
    marginCurve: "flat",
    priceRun6m: [-2, 10],
    priceRun1y: [4, 18],
    peRange: [20, 34],
    debtTrend: "flat",
    institutionalTrend: "flat",
    orderBookGrowth: [0, 12],
    qualityBase: [68, 85],
  },
  momentum_high_pe: {
    revGrowth: [16, 26],
    revCurve: "linear",
    profitGrowth: [12, 22],
    profitCurve: "flat",
    marginRange: [16, 24],
    marginCurve: "flat",
    priceRun6m: [25, 55],
    priceRun1y: [40, 90],
    peRange: [55, 95],
    debtTrend: "flat",
    institutionalTrend: "up",
    orderBookGrowth: [0, 15],
    qualityBase: [55, 72],
  },
  surprise_priced_in: {
    revGrowth: [10, 20],
    revCurve: "linear",
    profitGrowth: [20, 45],
    profitCurve: "accelerating",
    marginRange: [15, 22],
    marginCurve: "linear",
    priceRun6m: [22, 45],
    priceRun1y: [35, 65],
    peRange: [30, 50],
    debtTrend: "flat",
    institutionalTrend: "up",
    orderBookGrowth: [0, 18],
    qualityBase: [55, 70],
  },
  value_turnaround: {
    revGrowth: [3, 16],
    revCurve: "linear",
    profitGrowth: [-10, 35],
    profitCurve: "accelerating",
    marginRange: [7, 15],
    marginCurve: "accelerating",
    priceRun6m: [-8, 8],
    priceRun1y: [-15, 10],
    peRange: [8, 18],
    debtTrend: "down",
    institutionalTrend: "up",
    orderBookGrowth: [5, 30],
    qualityBase: [35, 52],
  },
  cyclical_recovery: {
    revGrowth: [-5, 22],
    revCurve: "accelerating",
    profitGrowth: [-15, 40],
    profitCurve: "accelerating",
    marginRange: [10, 19],
    marginCurve: "accelerating",
    priceRun6m: [-5, 18],
    priceRun1y: [-10, 22],
    peRange: [7, 16],
    debtTrend: "down",
    institutionalTrend: "flat",
    orderBookGrowth: [-5, 25],
    qualityBase: [40, 58],
  },
  decelerating: {
    revGrowth: [3, 18],
    revCurve: "decelerating",
    profitGrowth: [-5, 20],
    profitCurve: "decelerating",
    marginRange: [12, 20],
    marginCurve: "decelerating",
    priceRun6m: [-15, 2],
    priceRun1y: [-20, 5],
    peRange: [18, 32],
    debtTrend: "up",
    institutionalTrend: "down",
    orderBookGrowth: [-10, 8],
    qualityBase: [48, 65],
  },
  decliner: {
    revGrowth: [-10, 6],
    revCurve: "decelerating",
    profitGrowth: [-35, 0],
    profitCurve: "decelerating",
    marginRange: [4, 13],
    marginCurve: "decelerating",
    priceRun6m: [-30, -8],
    priceRun1y: [-45, -12],
    peRange: [10, 24],
    debtTrend: "up",
    institutionalTrend: "down",
    orderBookGrowth: [-20, -2],
    qualityBase: [22, 42],
  },
};

const TIER_RANGES: Record<MarketCapTier, [number, number]> = {
  large: [55000, 420000],
  mid: [11000, 54000],
  small: [2200, 10800],
  micro: [350, 2100],
};

function quarterLabels(n: number): string[] {
  // Latest completed quarter as of the mock "today" (Aug 2026) is Q1 FY27.
  const seq: { fy: number; q: number }[] = [];
  let fy = 27;
  let q = 1;
  for (let i = 0; i < n; i++) {
    seq.unshift({ fy, q });
    q -= 1;
    if (q === 0) {
      q = 4;
      fy -= 1;
    }
  }
  return seq.map((s) => `Q${s.q} FY${s.fy}`);
}

function trajectory(
  rng: Rng,
  start: number,
  end: number,
  n: number,
  curve: "accelerating" | "decelerating" | "linear" | "flat",
  noise: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    let shaped = t;
    if (curve === "accelerating") shaped = Math.pow(t, 1.7);
    else if (curve === "decelerating") shaped = Math.pow(t, 0.55);
    else if (curve === "flat") shaped = 0.5 + (t - 0.5) * 0.15;
    const value = start + (end - start) * shaped + rng.noise(noise);
    out.push(value);
  }
  return out;
}

function pctSeries(rng: Rng, base: number, n: number, dailyVol: number, driftTotal: number): PricePoint[] {
  const today = new Date("2026-08-12T00:00:00Z");
  const points: PricePoint[] = [];
  let price = base / (1 + driftTotal / 100);
  const drift = driftTotal / 100 / n;
  for (let i = n; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    price = price * (1 + drift + rng.noise(dailyVol));
    points.push({ date: d.toISOString().slice(0, 10), price: round(Math.max(price, 1), 2) });
  }
  // force last point to equal base exactly for consistency with displayed price
  points[points.length - 1] = { date: points[points.length - 1].date, price: round(base, 2) };
  return points;
}

function buildSignals(
  symbol: string,
  name: string,
  quarters: QuarterlyMetric[],
  scores: Scores,
  prevScores: Scores,
  shareholding: Shareholding,
  orderBookGrowthPct: number,
  earnings: EarningsRecord,
  change1m: number
): Signal[] {
  const signals: Signal[] = [];
  const latest = quarters[quarters.length - 1];
  const prev = quarters[quarters.length - 2];
  const first = quarters[0];
  let sid = 0;
  const id = () => `${symbol}-sig-${sid++}`;

  const revAccel = latest.revenueGrowthYoY - first.revenueGrowthYoY;
  if (revAccel > 10) {
    signals.push({
      id: id(),
      type: "revenue_acceleration",
      label: "Revenue acceleration",
      detail: `Revenue growth accelerated from ${round(first.revenueGrowthYoY)}% → ${round(latest.revenueGrowthYoY)}%`,
      severity: revAccel > 20 ? "high" : "medium",
    });
  }

  const profitAccel = latest.profitGrowthYoY - first.profitGrowthYoY;
  if (profitAccel > 15) {
    signals.push({
      id: id(),
      type: "profit_acceleration",
      label: "Profit acceleration",
      detail: `Profit growth accelerated from ${round(first.profitGrowthYoY)}% → ${round(latest.profitGrowthYoY)}%`,
      severity: profitAccel > 35 ? "high" : "medium",
    });
  }

  const marginChange = latest.ebitdaMargin - prev.ebitdaMargin;
  if (Math.abs(marginChange) > 1) {
    signals.push({
      id: id(),
      type: "margin_expansion",
      label: marginChange > 0 ? "Margin expansion" : "Margin contraction",
      detail: `EBITDA margin ${marginChange > 0 ? "expanded" : "contracted"} from ${round(prev.ebitdaMargin)}% → ${round(latest.ebitdaMargin)}%`,
      severity: Math.abs(marginChange) > 3 ? "high" : "medium",
    });
  }

  if (earnings.profitSurprisePct > 12) {
    signals.push({
      id: id(),
      type: "earnings_surprise",
      label: "Positive earnings surprise",
      detail: `Reported profit ${round(earnings.profitSurprisePct)}% above street estimates`,
      severity: earnings.profitSurprisePct > 25 ? "high" : "medium",
    });
  } else if (earnings.profitSurprisePct < -12) {
    signals.push({
      id: id(),
      type: "earnings_surprise",
      label: "Negative earnings surprise",
      detail: `Reported profit ${round(Math.abs(earnings.profitSurprisePct))}% below street estimates`,
      severity: earnings.profitSurprisePct < -25 ? "high" : "medium",
    });
  }

  if (orderBookGrowthPct > 25) {
    signals.push({
      id: id(),
      type: "large_order",
      label: "Order book expansion",
      detail: `Order book up ${round(orderBookGrowthPct)}% year-on-year`,
      severity: orderBookGrowthPct > 45 ? "high" : "medium",
    });
  }

  if (shareholding.fiiChange + shareholding.diiChange > 1.2) {
    signals.push({
      id: id(),
      type: "institutional_buying",
      label: "Institutional accumulation",
      detail: `FII+DII holding up ${round(shareholding.fiiChange + shareholding.diiChange)}pp over last 2 quarters`,
      severity: shareholding.fiiChange + shareholding.diiChange > 2.5 ? "high" : "medium",
    });
  } else if (shareholding.fiiChange + shareholding.diiChange < -1.2) {
    signals.push({
      id: id(),
      type: "institutional_selling",
      label: "Institutional selling",
      detail: `FII+DII holding down ${round(Math.abs(shareholding.fiiChange + shareholding.diiChange))}pp over last 2 quarters`,
      severity: "medium",
    });
  }

  if (shareholding.promoterChange > 0.5) {
    signals.push({
      id: id(),
      type: "promoter_buying",
      label: "Promoter stake increase",
      detail: `Promoter holding up ${round(shareholding.promoterChange)}pp`,
      severity: "low",
    });
  } else if (shareholding.promoterChange < -0.5) {
    signals.push({
      id: id(),
      type: "promoter_selling",
      label: "Promoter stake reduction",
      detail: `Promoter holding down ${round(Math.abs(shareholding.promoterChange))}pp`,
      severity: "medium",
    });
  }

  const scoreDelta = scores.multibagger - prevScores.multibagger;
  if (scoreDelta > 8) {
    signals.push({
      id: id(),
      type: "score_up",
      label: "Score improving",
      detail: `Multibagger score up ${round(scoreDelta)} points to ${round(scores.multibagger)}`,
      severity: scoreDelta > 15 ? "high" : "medium",
    });
  } else if (scoreDelta < -8) {
    signals.push({
      id: id(),
      type: "score_down",
      label: "Score deteriorating",
      detail: `Multibagger score down ${round(Math.abs(scoreDelta))} points to ${round(scores.multibagger)}`,
      severity: scoreDelta < -15 ? "high" : "medium",
    });
  }

  if (Math.abs(change1m) > 12) {
    signals.push({
      id: id(),
      type: "unusual_volume",
      label: "Unusual price move",
      detail: `Stock moved ${change1m > 0 ? "+" : ""}${round(change1m)}% in the last month`,
      severity: "low",
    });
  }

  return signals;
}

export function generateCompany(seed: CompanySeed, index: number): Company {
  const rng = new Rng(`${seed.symbol}-${index}`);
  const profile = PROFILES[seed.archetype];
  const n = 6;
  const quarters = quarterLabels(n);

  const revGrowthSeries = trajectory(rng, profile.revGrowth[0], profile.revGrowth[1], n, profile.revCurve, 2.2);
  const profitGrowthSeries = trajectory(rng, profile.profitGrowth[0], profile.profitGrowth[1], n, profile.profitCurve, 4);
  const marginSeries = trajectory(rng, profile.marginRange[0], profile.marginRange[1], n, profile.marginCurve, 0.6);

  const [tierMin, tierMax] = TIER_RANGES[seed.marketCapTier];
  const marketCapCr = round(rng.range(tierMin, tierMax), 0);
  const latestRevenue = marketCapCr * rng.range(0.18, 0.55);

  const revenues: number[] = new Array(n);
  revenues[n - 1] = latestRevenue;
  for (let i = n - 2; i >= 0; i--) {
    const qoq = revGrowthSeries[i + 1] / 4.2;
    revenues[i] = revenues[i + 1] / (1 + qoq / 100);
  }

  const debtStart = latestRevenue * rng.range(0.25, 0.6);
  const debtEnd =
    profile.debtTrend === "down"
      ? debtStart * rng.range(0.45, 0.75)
      : profile.debtTrend === "up"
        ? debtStart * rng.range(1.15, 1.55)
        : debtStart * rng.range(0.92, 1.08);
  const debtSeries = trajectory(rng, debtStart, debtEnd, n, "linear", debtStart * 0.03);

  const quarterlyHistory: QuarterlyMetric[] = quarters.map((label, i) => {
    const revenueCr = round(revenues[i], 0);
    const ebitdaMargin = round(clamp(marginSeries[i], 2, 55));
    const ebitda = revenueCr * (ebitdaMargin / 100);
    const profitCr = round(Math.max(ebitda * rng.range(0.45, 0.78) - debtSeries[i] * 0.01, revenueCr * -0.05), 0);
    const roce = round(clamp(ebitdaMargin * rng.range(0.75, 1.25) + rng.noise(3), 1, 55));
    const roe = round(clamp(roce * rng.range(0.7, 1.15), 1, 60));
    return {
      quarter: label,
      revenueCr,
      revenueGrowthYoY: round(revGrowthSeries[i]),
      profitCr,
      profitGrowthYoY: round(profitGrowthSeries[i]),
      ebitdaMargin,
      roce,
      roe,
      debtCr: round(Math.max(debtSeries[i], 0), 0),
      operatingCashFlowCr: round(profitCr * rng.range(0.85, 1.45), 0),
    };
  });

  const latest = quarterlyHistory[n - 1];
  const prevQ = quarterlyHistory[n - 2];
  const first = quarterlyHistory[0];

  const pe = round(rng.range(profile.peRange[0], profile.peRange[1]), 1);
  const debtToEquity = round(clamp(latest.debtCr / (marketCapCr * 0.4 + 1), 0, 3), 2);
  const orderBookGrowthPct = round(rng.range(profile.orderBookGrowth[0], profile.orderBookGrowth[1]));

  const change1y = round(rng.range(profile.priceRun1y[0], profile.priceRun1y[1]));
  const change6m = round(rng.range(profile.priceRun6m[0], profile.priceRun6m[1]));
  const change1m = round(change6m * rng.range(0.15, 0.4) + rng.noise(2));
  const change1w = round(change1m * rng.range(0.15, 0.35) + rng.noise(0.8));
  const change1d = round(rng.noise(2.2));

  const price = round(rng.range(35, 4200), 2);
  const priceHistory = pctSeries(rng, price, 90, 0.018, change6m);

  const institTrendVal =
    profile.institutionalTrend === "up" ? rng.range(0.5, 3.2) : profile.institutionalTrend === "down" ? -rng.range(0.4, 2.6) : rng.noise(0.5);
  const fii = round(clamp(rng.range(4, 32)));
  const dii = round(clamp(rng.range(3, 24)));
  const promoter = round(clamp(rng.range(28, 68)));
  const shareholding: Shareholding = {
    promoter,
    promoterChange: round(rng.noise(1.2)),
    fii,
    fiiChange: round(institTrendVal * rng.range(0.5, 0.65)),
    dii: dii,
    diiChange: round(institTrendVal * rng.range(0.35, 0.5)),
    public: round(Math.max(0, 100 - promoter - fii - dii)),
  };

  const qualityBase = rng.range(profile.qualityBase[0], profile.qualityBase[1]);

  function computeScores(q: QuarterlyMetric, qPrev: QuarterlyMetric, qFirst: QuarterlyMetric): Scores {
    const growth = clamp(38 + q.revenueGrowthYoY * 0.9 + q.profitGrowthYoY * 0.35 + rng.noise(4));
    const earningsAcceleration = clamp(
      42 + (q.profitGrowthYoY - qFirst.profitGrowthYoY) * 0.9 + (q.revenueGrowthYoY - qFirst.revenueGrowthYoY) * 0.6 + rng.noise(4)
    );
    const marginExpansion = clamp(50 + (q.ebitdaMargin - qFirst.ebitdaMargin) * 6 + rng.noise(4));
    const quality = clamp(qualityBase + (q.roce - 15) * 0.8 - debtToEquity * 6 + rng.noise(3));
    const valuation = clamp(100 - (pe / Math.max(q.revenueGrowthYoY + q.profitGrowthYoY, 8)) * 9 + rng.noise(5));
    const momentum = clamp(50 + change1m * 1.6 + change6m * 0.35 + rng.noise(4));
    const institutionalActivity = clamp(55 + institTrendVal * 9 + rng.noise(4));
    const orderBook = clamp(45 + orderBookGrowthPct * 0.8 + rng.noise(4));
    const earningsSurprise = clamp(55 + rng.noise(18));
    const priorRunUpPenalty = clamp((change6m - 15) * 0.6, 0, 25);
    const multibagger = clamp(
      earningsAcceleration * 0.22 +
        marginExpansion * 0.16 +
        orderBook * 0.13 +
        institutionalActivity * 0.12 +
        growth * 0.11 +
        valuation * 0.11 +
        quality * 0.08 +
        (100 - qPrev.debtCr / (q.debtCr + 1) * 0) * 0 +
        7 -
        priorRunUpPenalty * 0.3
    );
    return {
      quality: round(quality, 0),
      growth: round(growth, 0),
      earningsAcceleration: round(earningsAcceleration, 0),
      marginExpansion: round(marginExpansion, 0),
      earningsSurprise: round(earningsSurprise, 0),
      valuation: round(valuation, 0),
      momentum: round(momentum, 0),
      institutionalActivity: round(institutionalActivity, 0),
      orderBook: round(orderBook, 0),
      multibagger: round(multibagger, 0),
    };
  }

  const scores = computeScores(latest, prevQ, first);
  const previousScores = computeScores(prevQ, quarterlyHistory[n - 3] ?? prevQ, first);

  const expectedRevenue = latest.revenueCr * rng.range(0.94, 1.02);
  const expectedProfit = latest.profitCr * rng.range(0.9, 1.05);
  const revenueSurprisePct = round(((latest.revenueCr - expectedRevenue) / Math.max(expectedRevenue, 1)) * 100);
  const profitSurprisePct = round(((latest.profitCr - expectedProfit) / Math.max(Math.abs(expectedProfit), 1)) * 100);
  const expectedEps = round(rng.range(2, 85), 2);
  const actualEps = round(expectedEps * (1 + profitSurprisePct / 100), 2);

  const offsetDays = rng.int(-20, 15);
  const resultDate = new Date("2026-08-12T00:00:00Z");
  resultDate.setDate(resultDate.getDate() + offsetDays);
  const status: EarningsRecord["status"] =
    offsetDays === 0 ? "today" : offsetDays > 0 ? "upcoming" : offsetDays >= -7 ? "this_week" : "released";

  const guidanceOptions = [
    `Management guided for ${round(rng.range(12, 28))}-${round(rng.range(28, 40))}% revenue growth in FY27, citing strong order pipeline.`,
    `Management maintained margin guidance of ${round(latest.ebitdaMargin)}-${round(latest.ebitdaMargin + 2)}% for the rest of the year.`,
    `Management flagged near-term input cost pressure but reiterated full-year growth targets.`,
    `Management indicated capacity expansion coming online over the next 2-3 quarters.`,
  ];

  const earnings: EarningsRecord = {
    resultDate: resultDate.toISOString().slice(0, 10),
    quarter: quarters[n - 1],
    expectedRevenueCr: round(expectedRevenue, 0),
    actualRevenueCr: latest.revenueCr,
    revenueSurprisePct,
    expectedProfitCr: round(expectedProfit, 0),
    actualProfitCr: latest.profitCr,
    profitSurprisePct,
    expectedEps,
    actualEps,
    epsSurprisePct: profitSurprisePct,
    marginSurprisePct: round(rng.noise(6)),
    stockReactionPct: round(clamp(profitSurprisePct * 0.35 + rng.noise(3), -18, 18)),
    priorRunUp3mPct: round(change6m * rng.range(0.4, 0.7)),
    guidance: rng.pick(guidanceOptions),
    status,
  };

  const newsTemplates: NewsItem[] = [
    { date: earnings.resultDate, headline: `${seed.name} reports Q${quarters[n - 1].slice(1, 2)} results: revenue ${revenueSurprisePct >= 0 ? "beats" : "misses"} estimates`, category: "results" },
    { date: shiftDate(-18, rng), headline: `${seed.name} announces new order win worth ₹${round(rng.range(80, 1200), 0)} Cr`, category: "order" },
    { date: shiftDate(-34, rng), headline: `${seed.name} board approves capacity expansion plan`, category: "management" },
    { date: shiftDate(-52, rng), headline: `${institTrendVal > 0 ? "FII/DII increase" : "FII/DII trim"} stake in ${seed.name}`, category: "institutional" },
  ];

  const businessOverview = `${seed.name} operates in the ${seed.industry} segment within the broader ${seed.sector} sector. The company reported revenue of ₹${latest.revenueCr.toLocaleString(
    "en-IN"
  )} Cr in ${latest.quarter}, with an EBITDA margin of ${latest.ebitdaMargin}%.`;

  const riskFactorPool = [
    "Elevated input cost volatility could pressure near-term margins.",
    "Revenue is concentrated among a small number of large customers.",
    "Working capital cycle has lengthened over the last few quarters.",
    "Regulatory changes in the sector could impact pricing power.",
    "Promoter pledge levels warrant monitoring.",
    "Execution risk on newly announced capacity expansion.",
    "High dependence on export markets exposes it to currency risk.",
    "Competitive intensity has increased from new entrants.",
  ];
  const riskFactors = shuffle(rng, riskFactorPool).slice(0, 3);

  const thesisDirection =
    scores.multibagger >= 70
      ? "an early-stage improvement in business fundamentals that the market may not have fully priced in"
      : scores.multibagger >= 45
        ? "a mixed setup with some improving signals offset by valuation or execution concerns"
        : "deteriorating fundamentals that warrant caution";
  const aiThesis = `${seed.name}'s revenue growth has moved from ${round(first.revenueGrowthYoY)}% to ${round(
    latest.revenueGrowthYoY
  )}% over the last ${n} quarters, while EBITDA margins have moved from ${round(first.ebitdaMargin)}% to ${round(
    latest.ebitdaMargin
  )}%. Combined with ${orderBookGrowthPct >= 0 ? "an order book up" : "an order book down"} ${Math.abs(
    orderBookGrowthPct
  )}% and ${institTrendVal >= 0 ? "rising" : "falling"} institutional ownership, this points to ${thesisDirection}. The stock is up only ${round(
    change6m
  )}% over 6 months, trading at ${pe}x earnings.`;

  return {
    id: seed.symbol,
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    industry: seed.industry,
    archetype: seed.archetype,
    marketCapTier: seed.marketCapTier,
    marketCapCr,
    price,
    change1d,
    change1w,
    change1m,
    change6m,
    change1y,
    pe,
    debtToEquity,
    orderBookGrowthPct,
    quarterlyHistory,
    scores,
    previousScores,
    signals: buildSignals(seed.symbol, seed.name, quarterlyHistory, scores, previousScores, shareholding, orderBookGrowthPct, earnings, change1m),
    priceHistory,
    shareholding,
    earnings,
    news: newsTemplates,
    peers: [],
    aiThesis,
    businessOverview,
    riskFactors,
    managementGuidance: earnings.guidance,
  };
}

function shiftDate(daysAgo: number, rng: Rng): string {
  const d = new Date("2026-08-12T00:00:00Z");
  d.setDate(d.getDate() - daysAgo - rng.int(0, 6));
  return d.toISOString().slice(0, 10);
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
