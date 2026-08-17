import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * Stoxim fundamentals API client.
 *
 * CONFIRMED against the live stoxim.com marketing page (2026-08-15):
 *   - Base URL: https://api.stoxim.in/v1
 *   - Auth: `X-API-Key: <key>` header
 *   - Endpoint: GET /v1/financials/{isin}
 *   - Response envelope: { status: "success", data: { isin, company_name, period, ... } }
 *   - Confirmed data fields: revenue, net_income, earnings_per_share
 *   - Free tier: 500 requests/day
 *
 * NOT CONFIRMED — as of this writing, api.stoxim.in and docs.stoxim.com both
 * fail DNS resolution (NXDOMAIN). The API is not currently live, so none of
 * this has been exercised against a real response, and the marketing page's
 * one example response is truncated ("...") — it does not show the full
 * field list. Field names below beyond revenue/net_income/earnings_per_share
 * (ebitda, ebit, assets, liabilities, debt, cash flow, roe, roce, pe, pb,
 * debt/equity) are best-effort guesses at snake_case naming, NOT verified
 * documentation. FIELD_ALIASES lists every candidate key we try per value;
 * update this the moment a real response is available.
 */

const STOXIM_BASE_URL = "https://api.stoxim.in/v1";

export interface StoximFinancials {
  isin: string;
  companyName: string | null;
  period: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  pat: number | null;
  eps: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalDebt: number | null;
  cash: number | null;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  roe: number | null;
  roce: number | null;
  pe: number | null;
  pb: number | null;
  debtEquity: number | null;
}

// key -> ordered list of candidate response keys to try. First confirmed,
// rest are unverified guesses (see module doc comment above).
const FIELD_ALIASES: Record<keyof Omit<StoximFinancials, "isin" | "companyName" | "period">, string[]> = {
  revenue: ["revenue"],
  pat: ["net_income", "pat", "profit_after_tax"],
  eps: ["earnings_per_share", "eps"],
  ebitda: ["ebitda"],
  ebit: ["ebit", "operating_income"],
  totalAssets: ["total_assets"],
  totalLiabilities: ["total_liabilities"],
  totalDebt: ["total_debt", "debt"],
  cash: ["cash", "cash_and_equivalents"],
  operatingCashFlow: ["operating_cash_flow", "cash_flow_operating"],
  investingCashFlow: ["investing_cash_flow", "cash_flow_investing"],
  financingCashFlow: ["financing_cash_flow", "cash_flow_financing"],
  roe: ["roe", "return_on_equity"],
  roce: ["roce", "return_on_capital_employed"],
  pe: ["pe", "pe_ratio", "price_to_earnings"],
  pb: ["pb", "pb_ratio", "price_to_book"],
  debtEquity: ["debt_equity", "debt_to_equity"],
};

/**
 * Reads a numeric value from raw API data, trying each candidate key in
 * order. Returns null (never 0) when no candidate key is present — a field
 * the API omitted must stay NULL, not silently become zero.
 */
function pickNumeric(data: Record<string, unknown>, candidateKeys: string[]): number | null {
  for (const key of candidateKeys) {
    if (key in data && data[key] !== null && data[key] !== undefined) {
      const value = typeof data[key] === "string" ? Number(data[key]) : data[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  return null;
}

export class StoximApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "StoximApiError";
  }
}

export interface StoximClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class StoximClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: StoximClientOptions) {
    if (!options.apiKey) {
      throw new Error("StoximClient requires an apiKey (set STOXIM_API_KEY in .env.local)");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? STOXIM_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getFinancials(isin: string): Promise<{ parsed: StoximFinancials; raw: unknown }> {
    const response = await this.fetchImpl(`${this.baseUrl}/financials/${encodeURIComponent(isin)}`, {
      headers: { "X-API-Key": this.apiKey },
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? parseRetryAfter(retryAfterHeader) : undefined;
      throw new RateLimitedError(`Stoxim rate limit hit for ${isin}`, retryAfterMs);
    }

    if (!response.ok) {
      throw new StoximApiError(`Stoxim request failed for ${isin}: HTTP ${response.status}`, response.status);
    }

    const raw = await response.json();
    return { parsed: parseFinancialsResponse(isin, raw), raw };
  }
}

export function parseFinancialsResponse(isin: string, raw: unknown): StoximFinancials {
  if (typeof raw !== "object" || raw === null) {
    throw new StoximApiError(`Unexpected Stoxim response shape for ${isin}: not an object`);
  }
  const envelope = raw as Record<string, unknown>;
  if (envelope.status !== "success") {
    const message = typeof envelope.message === "string" ? envelope.message : JSON.stringify(envelope);
    throw new StoximApiError(`Stoxim returned a non-success status for ${isin}: ${message}`);
  }
  const data = envelope.data;
  if (typeof data !== "object" || data === null) {
    throw new StoximApiError(`Stoxim response for ${isin} has no data object`);
  }
  const d = data as Record<string, unknown>;

  return {
    isin: typeof d.isin === "string" ? d.isin : isin,
    companyName: typeof d.company_name === "string" ? d.company_name : null,
    period: typeof d.period === "string" ? d.period : null,
    revenue: pickNumeric(d, FIELD_ALIASES.revenue),
    pat: pickNumeric(d, FIELD_ALIASES.pat),
    eps: pickNumeric(d, FIELD_ALIASES.eps),
    ebitda: pickNumeric(d, FIELD_ALIASES.ebitda),
    ebit: pickNumeric(d, FIELD_ALIASES.ebit),
    totalAssets: pickNumeric(d, FIELD_ALIASES.totalAssets),
    totalLiabilities: pickNumeric(d, FIELD_ALIASES.totalLiabilities),
    totalDebt: pickNumeric(d, FIELD_ALIASES.totalDebt),
    cash: pickNumeric(d, FIELD_ALIASES.cash),
    operatingCashFlow: pickNumeric(d, FIELD_ALIASES.operatingCashFlow),
    investingCashFlow: pickNumeric(d, FIELD_ALIASES.investingCashFlow),
    financingCashFlow: pickNumeric(d, FIELD_ALIASES.financingCashFlow),
    roe: pickNumeric(d, FIELD_ALIASES.roe),
    roce: pickNumeric(d, FIELD_ALIASES.roce),
    pe: pickNumeric(d, FIELD_ALIASES.pe),
    pb: pickNumeric(d, FIELD_ALIASES.pb),
    debtEquity: pickNumeric(d, FIELD_ALIASES.debtEquity),
  };
}

function parseRetryAfter(headerValue: string): number | undefined {
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(headerValue);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}
