import { companies, emergingOpportunities, multibaggerRadar, sectorSummaries, getCompany } from "@/lib/mock-data";
import { round } from "@/lib/mock/rng";

export interface AiSource {
  label: string;
  value: string;
}

export interface AiResponse {
  answer: string;
  sources: AiSource[];
}

export const SUGGESTED_QUERIES = [
  "Which companies have accelerating profits but haven't rallied yet?",
  "Which sectors currently have the highest earnings acceleration?",
  "Find companies where revenue growth accelerated for three consecutive quarters.",
  "Show me the top emerging opportunity right now.",
  "Why did a stock fall despite strong results?",
];

function findMentionedCompany(query: string) {
  const q = query.toLowerCase();
  return companies.find((c) => q.includes(c.name.toLowerCase()) || q.includes(c.symbol.toLowerCase()));
}

export function answerQuery(query: string): AiResponse {
  const q = query.toLowerCase();
  const mentioned = findMentionedCompany(query);

  if (mentioned) {
    const c = mentioned;
    const scoreDelta = round(c.scores.multibagger - c.previousScores.multibagger);
    if (q.includes("compare") || q.includes("peer") || q.includes("competitor")) {
      const peers = c.peers.map((s) => getCompany(s)).filter(Boolean) as typeof companies;
      const lines = peers
        .slice(0, 4)
        .map((p) => `${p.name} (${p.symbol}) — Multibagger ${p.scores.multibagger}, Quality ${p.scores.quality}, PE ${p.pe}x`);
      return {
        answer: `${c.name} vs sector peers in ${c.sector}: ${c.name} scores Multibagger ${c.scores.multibagger}, Quality ${c.scores.quality}, trading at ${c.pe}x PE. Compared to peers:\n${lines.join("\n")}`,
        sources: peers.slice(0, 4).map((p) => ({ label: p.symbol, value: `Multibagger ${p.scores.multibagger}` })),
      };
    }
    if (q.includes("fall") || q.includes("drop") || q.includes("despite")) {
      return {
        answer: `${c.name} moved ${c.change1m > 0 ? "+" : ""}${c.change1m}% over the last month. Its latest reported profit surprise was ${c.earnings.profitSurprisePct}% versus estimates, but the stock had already run up ${c.earnings.priorRunUp3mPct}% in the prior 3 months — much of the good news may already have been priced in, and institutional flow is ${c.shareholding.fiiChange + c.shareholding.diiChange >= 0 ? "positive" : "turning negative"}.`,
        sources: [
          { label: "Profit surprise", value: `${c.earnings.profitSurprisePct}%` },
          { label: "Prior 3M run-up", value: `${c.earnings.priorRunUp3mPct}%` },
          { label: "1M price change", value: `${c.change1m}%` },
        ],
      };
    }
    return {
      answer: `${c.name} entered/moved on the Multibagger Radar with a score of ${c.scores.multibagger} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs prior quarter). Revenue growth moved from ${c.quarterlyHistory[0].revenueGrowthYoY}% to ${c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY}%, EBITDA margin from ${c.quarterlyHistory[0].ebitdaMargin}% to ${c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin}%, with order book ${c.orderBookGrowthPct >= 0 ? "up" : "down"} ${Math.abs(c.orderBookGrowthPct)}%. Stock price is only ${c.change6m > 0 ? "+" : ""}${c.change6m}% over 6 months, at ${c.pe}x PE.`,
      sources: [
        { label: "Multibagger score", value: `${c.scores.multibagger} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})` },
        { label: "Revenue growth trend", value: `${c.quarterlyHistory[0].revenueGrowthYoY}% → ${c.quarterlyHistory[c.quarterlyHistory.length - 1].revenueGrowthYoY}%` },
        { label: "Margin trend", value: `${c.quarterlyHistory[0].ebitdaMargin}% → ${c.quarterlyHistory[c.quarterlyHistory.length - 1].ebitdaMargin}%` },
        { label: "6M price change", value: `${c.change6m}%` },
      ],
    };
  }

  if (q.includes("accelerating profit") || (q.includes("profit") && q.includes("rally"))) {
    const candidates = companies
      .filter((c) => c.scores.earningsAcceleration >= 65 && c.change6m < 15)
      .sort((a, b) => b.scores.earningsAcceleration - a.scores.earningsAcceleration)
      .slice(0, 6);
    return {
      answer: `${candidates.length} companies show strong earnings acceleration (score ≥ 65) while the stock is up less than 15% over 6 months — the market may not have fully priced in the improvement yet.`,
      sources: candidates.map((c) => ({ label: `${c.name} (${c.symbol})`, value: `Accel ${c.scores.earningsAcceleration}, 6M ${c.change6m}%` })),
    };
  }

  if (q.includes("sector") && (q.includes("acceleration") || q.includes("earnings"))) {
    const top = [...sectorSummaries].sort((a, b) => b.avgProfitGrowth - a.avgProfitGrowth).slice(0, 5);
    return {
      answer: `Ranked by average profit growth across tracked companies, the sectors currently showing the most acceleration are: ${top.map((s) => s.sector).join(", ")}.`,
      sources: top.map((s) => ({ label: s.sector, value: `Avg profit growth ${s.avgProfitGrowth}%` })),
    };
  }

  if (q.includes("three consecutive") || q.includes("consecutive quarters")) {
    const candidates = companies
      .filter((c) => {
        const h = c.quarterlyHistory;
        const n = h.length;
        return h[n - 1].revenueGrowthYoY > h[n - 2].revenueGrowthYoY && h[n - 2].revenueGrowthYoY > h[n - 3].revenueGrowthYoY && h[n - 3].revenueGrowthYoY > h[n - 4].revenueGrowthYoY;
      })
      .slice(0, 6);
    return {
      answer: `${candidates.length} companies show revenue growth accelerating for at least three consecutive quarters.`,
      sources: candidates.map((c) => ({
        label: `${c.name} (${c.symbol})`,
        value: c.quarterlyHistory.slice(-4).map((q) => `${q.revenueGrowthYoY}%`).join(" → "),
      })),
    };
  }

  if (q.includes("similar to") || q.includes("early-stage")) {
    const top = emergingOpportunities.slice(0, 5).map((x) => x.company);
    return {
      answer: `Companies with a similar profile — small/mid-cap, accelerating fundamentals, limited price run-up so far — include: ${top.map((c) => c.name).join(", ")}.`,
      sources: top.map((c) => ({ label: c.symbol, value: `Multibagger ${c.scores.multibagger}` })),
    };
  }

  if (q.includes("top") && (q.includes("emerging") || q.includes("opportunity"))) {
    const top = emergingOpportunities[0]?.company ?? multibaggerRadar[0];
    return {
      answer: `${top.name} (${top.symbol}) currently has the strongest change signal: Multibagger score ${top.scores.multibagger}, up from ${top.previousScores.multibagger} last quarter. ${top.aiThesis}`,
      sources: [
        { label: "Multibagger score", value: `${top.scores.multibagger}` },
        { label: "Sector", value: top.sector },
        { label: "6M price change", value: `${top.change6m}%` },
      ],
    };
  }

  const fallback = multibaggerRadar[0];
  return {
    answer: `I can answer questions grounded in the tracked universe's fundamentals, scores, and price data. Try asking about a specific company, a sector, or a screen like "companies with accelerating profits that haven't rallied yet." As a starting point, ${fallback.name} currently has the highest Multibagger Radar score (${fallback.scores.multibagger}).`,
    sources: [{ label: "Top Multibagger score", value: `${fallback.name} — ${fallback.scores.multibagger}` }],
  };
}
