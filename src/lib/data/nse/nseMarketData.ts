import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * NSE historical price (OHLCV) client.
 *
 * CONFIRMED against live nseindia.com (2026-08-16), found via the real
 * "Security-wise Price Volume & Deliverable Position Data" report page
 * (https://www.nseindia.com/report-detail/eq_security) and its actual JS
 * (`dist/js/sections/reports/security-wise-archives.js`), not guessed:
 *   GET /api/historicalOR/generateSecurityWiseHistoricalData
 *     ?from=DD-MM-YYYY&to=DD-MM-YYYY&symbol=<SYMBOL>&type=priceVolume&series=EQ
 * `type=priceVolume` is one of three real modes the page supports
 * ("priceVolume" | "deliverable" | "priceVolumeDeliverable"); priceVolume is
 * the plain OHLCV one. Verified live for RELIANCE, returning real trading
 * days (weekends correctly excluded) with current (Aug 2026) prices — this
 * is not the old-archive-only behavior seen on the financial-results
 * endpoint. Response shape: `{ data: [{ CH_SYMBOL, CH_SERIES, mTIMESTAMP
 * ("DD-Mon-YYYY"), CH_OPENING_PRICE, CH_TRADE_HIGH_PRICE,
 * CH_TRADE_LOW_PRICE, CH_CLOSING_PRICE, VWAP, CH_TOT_TRADED_QTY,
 * CH_TOT_TRADED_VAL, ... }] }`, most-recent-first.
 *
 * No `adjustedClose` field exists in this source — NSE's historical archive
 * reports raw traded prices, not split/dividend-adjusted ones. That column
 * stays null for NSE-sourced rows rather than being computed here.
 *
 * NOT YET CONFIRMED: a dedicated real-time "quote" endpoint. getQuote()
 * below deliberately reuses this same verified historical endpoint (asking
 * for the most recent available day) rather than guessing at a separate
 * live-quote URL that hasn't been tested.
 *
 * VERIFIED PER-REQUEST CAP (2026-08-17): asking for a full 365-day range in
 * one call silently returns only the most recent ~70 trading days — no
 * error, no pagination field, just truncation. Requesting an older window
 * directly (not touching "today") does return real data for that period, so
 * this is a per-call response cap, not a hard depth limit. See
 * getHistoricalPricesChunked() for how longer ranges are actually fetched
 * (multiple real requests against this same endpoint, not a new one).
 */

const NSE_BASE_URL = "https://www.nseindia.com";

function browserHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.nseindia.com/report-detail/eq_security",
  };
}

export class NseMarketDataError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "NseMarketDataError";
  }
}

export interface NseHistoricalPriceRow {
  CH_SYMBOL: string;
  CH_SERIES: string;
  mTIMESTAMP: string;
  CH_OPENING_PRICE: number;
  CH_TRADE_HIGH_PRICE: number;
  CH_TRADE_LOW_PRICE: number;
  CH_CLOSING_PRICE: number;
  CH_LAST_TRADED_PRICE: number;
  VWAP: number | null;
  CH_TOT_TRADED_QTY: number;
  CH_TOT_TRADED_VAL: number | null;
}

/** Formats a Date as NSE's DD-MM-YYYY parameter format. */
export function formatNseDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export interface MarketDataProvider {
  getHistoricalPrices(symbol: string, fromDate: Date, toDate: Date): Promise<{ rows: NseHistoricalPriceRow[]; raw: unknown }>;
  getQuote(symbol: string): Promise<NseHistoricalPriceRow | null>;
}

export class NseMarketDataClient implements MarketDataProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getHistoricalPrices(symbol: string, fromDate: Date, toDate: Date): Promise<{ rows: NseHistoricalPriceRow[]; raw: unknown }> {
    const url = `${NSE_BASE_URL}/api/historicalOR/generateSecurityWiseHistoricalData?from=${formatNseDate(fromDate)}&to=${formatNseDate(toDate)}&symbol=${encodeURIComponent(symbol)}&type=priceVolume&series=EQ`;
    const response = await this.fetchImpl(url, { headers: browserHeaders(), signal: AbortSignal.timeout(30000) });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new RateLimitedError(`NSE rate limit hit for ${symbol}`, retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined);
    }
    if (!response.ok) {
      throw new NseMarketDataError(`NSE historical-price request failed for ${symbol}: HTTP ${response.status}`, response.status);
    }

    const raw = await response.json();
    if (typeof raw !== "object" || raw === null || !Array.isArray((raw as Record<string, unknown>).data)) {
      throw new NseMarketDataError(`Unexpected NSE historical-price response shape for ${symbol}: expected { data: [...] }`);
    }
    return { rows: (raw as { data: NseHistoricalPriceRow[] }).data, raw };
  }

  async getQuote(symbol: string): Promise<NseHistoricalPriceRow | null> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const { rows } = await this.getHistoricalPrices(symbol, weekAgo, today);
    return rows[0] ?? null;
  }

  /**
   * Fetches a date range longer than NSE's per-request cap by splitting it
   * into sequential chunks. CONFIRMED live (2026-08-17): requesting a full
   * 365-day range for RELIANCE silently returned only the most recent ~70
   * trading days (server-side truncation, not documented) — but requesting
   * an older 90-calendar-day window on its own returned real data for that
   * period, confirming NSE genuinely retains deeper history and this is a
   * per-call cap, not a hard depth limit. `minIntervalMs` paces requests
   * between chunks for the same reason the ingest scripts pace between
   * companies — this method makes multiple real requests, not one.
   */
  async getHistoricalPricesChunked(symbol: string, fromDate: Date, toDate: Date, chunkDays = 80, minIntervalMs = 800): Promise<{ rows: NseHistoricalPriceRow[]; raw: unknown[] }> {
    const allRows: NseHistoricalPriceRow[] = [];
    const allRaw: unknown[] = [];
    const seenDates = new Set<string>();

    let chunkEnd = new Date(toDate);
    while (chunkEnd > fromDate) {
      const chunkStart = new Date(chunkEnd);
      chunkStart.setUTCDate(chunkStart.getUTCDate() - chunkDays);
      const effectiveStart = chunkStart < fromDate ? fromDate : chunkStart;

      const { rows, raw } = await this.getHistoricalPrices(symbol, effectiveStart, chunkEnd);
      allRaw.push(raw);
      for (const row of rows) {
        if (!seenDates.has(row.mTIMESTAMP)) {
          seenDates.add(row.mTIMESTAMP);
          allRows.push(row);
        }
      }

      chunkEnd = new Date(effectiveStart);
      chunkEnd.setUTCDate(chunkEnd.getUTCDate() - 1);
      if (chunkEnd > fromDate) await new Promise((resolve) => setTimeout(resolve, minIntervalMs));
    }

    return { rows: allRows, raw: allRaw };
  }
}

export interface ParsedNsePriceRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number | null;
  volume: number;
  tradedValue: number | null;
}

const MONTH_ABBREVIATIONS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parses NSE's "DD-Mon-YYYY" timestamp format (e.g. "14-Aug-2026") into a UTC Date. */
export function parseNseTimestamp(raw: string): Date {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Unrecognized NSE date format: "${raw}"`);
  }
  const [, day, monAbbrev, year] = match;
  const month = MONTH_ABBREVIATIONS[monAbbrev.toLowerCase()];
  if (month === undefined) {
    throw new Error(`Unrecognized month abbreviation in NSE date: "${raw}"`);
  }
  return new Date(Date.UTC(Number(year), month, Number(day)));
}

/** Normalizes one raw NSE historical-price row into PriceHistory-shaped fields. */
export function parseNsePriceRow(row: NseHistoricalPriceRow): ParsedNsePriceRow {
  return {
    date: parseNseTimestamp(row.mTIMESTAMP),
    open: row.CH_OPENING_PRICE,
    high: row.CH_TRADE_HIGH_PRICE,
    low: row.CH_TRADE_LOW_PRICE,
    close: row.CH_CLOSING_PRICE,
    adjustedClose: null,
    volume: row.CH_TOT_TRADED_QTY,
    tradedValue: row.CH_TOT_TRADED_VAL ?? null,
  };
}
