import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * BSE historical price client.
 *
 * CONFIRMED against live bseindia.com (2026-08-17), found by fetching a real
 * stock page (bseindia.com/stock-share-price/.../.../<scripcode>/) and
 * analyzing its actual Angular bundle (assets/includenew/js/main-*.js):
 *   GET https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w
 *     ?scripcode=<BSE_CODE>&flag=<"0"|"5D"|"1M"|"3M"|"6M"|"12M">&fromdate=&todate=&seriesid=
 * Verified live for RELIANCE (BSE code 500325) with flag=3M: returned 63
 * real trading days (18-May-2026 to 14-Aug-2026), prices consistent with
 * NSE's independently-ingested figures for the same dates.
 *
 * IMPORTANT LIMITATION (verified, not assumed): this endpoint's response
 * only contains a single daily price (`vale1`) and volume (`vole`) per day —
 * no separate open/high/low fields exist in the response at all. Unlike
 * NSE, BSE's full-OHLC "Bhavcopy"/UDiFF product requires member
 * registration (confirmed: the site's own subscription form gates it, and
 * the legacy public-looking BhavCopy download path serves the SPA shell,
 * not a real file). So BSE-sourced PriceHistory rows only ever populate
 * close + volume; open/high/low stay NULL (see schema migration
 * price_history_ohl_nullable) rather than being backfilled from close.
 */

const BSE_BASE_URL = "https://api.bseindia.com/BseIndiaAPI/api";

function browserHeaders(referer: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: referer,
  };
}

export class BseMarketDataError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "BseMarketDataError";
  }
}

export interface BseGraphPoint {
  dttm: string;
  vale1: string;
  vole: string;
}

export interface BseStockReachGraphResponse {
  CurrDate: string | null;
  PrevClose: string | null;
  Data: string;
}

export type BseFlag = "5D" | "1M" | "3M" | "6M" | "12M";

export class BseMarketDataClient {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getHistoricalPrices(bseCode: string, flag: BseFlag = "3M"): Promise<{ points: BseGraphPoint[]; raw: unknown }> {
    const referer = `https://www.bseindia.com/stock-share-price/x/x/${bseCode}/`;
    const url = `${BSE_BASE_URL}/StockReachGraph/w?scripcode=${encodeURIComponent(bseCode)}&flag=${flag}&fromdate=&todate=&seriesid=`;
    const response = await this.fetchImpl(url, { headers: browserHeaders(referer), signal: AbortSignal.timeout(30000) });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new RateLimitedError(`BSE rate limit hit for ${bseCode}`, retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined);
    }
    if (!response.ok) {
      throw new BseMarketDataError(`BSE StockReachGraph request failed for ${bseCode}: HTTP ${response.status}`, response.status);
    }

    const raw = (await response.json()) as BseStockReachGraphResponse;
    if (typeof raw.Data !== "string") {
      throw new BseMarketDataError(`Unexpected BSE StockReachGraph response shape for ${bseCode}: no Data field`);
    }
    if (raw.Data === "[]" || raw.Data === "") {
      return { points: [], raw };
    }
    let points: BseGraphPoint[];
    try {
      points = JSON.parse(raw.Data);
    } catch {
      throw new BseMarketDataError(`Could not parse BSE StockReachGraph Data field for ${bseCode}`);
    }
    return { points, raw };
  }
}

export interface ParsedBsePriceRow {
  date: Date;
  close: number;
  volume: number;
}

/**
 * Parses one BSE graph point. `dttm` is a JS-Date-parseable string like
 * "Wed Aug 14 2026 00:00:00" (server-local, already date-only for
 * multi-day flags) — parsed with the standard Date constructor since it's
 * an unambiguous RFC-2822-like format, not a custom one requiring a manual
 * parser like NSE's "DD-Mon-YYYY".
 */
export function parseBsePricePoint(point: BseGraphPoint): ParsedBsePriceRow | null {
  const date = new Date(point.dttm);
  const close = Number(point.vale1);
  const volume = Number(point.vole);
  if (Number.isNaN(date.getTime()) || !Number.isFinite(close)) return null;
  return {
    date: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())),
    close,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}
