import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * NSE corporate-announcements client.
 *
 * CONFIRMED against live nseindia.com (2026-08-16), found in the real
 * `dist/js/sections/corporate-filings.js` bundle (same file that revealed
 * the financial-results params — see nseFinancials.ts):
 *   GET /api/corporate-announcements
 *     ?index=equities&symbol=<SYMBOL>&from_date=DD-MM-YYYY&to_date=DD-MM-YYYY
 * Verified live for RELIANCE: returned 19 real, current announcements
 * (Aug 2026), including genuine current news (a Reliance/Rolls-Royce
 * partnership release dated 14-Aug-2026).
 *
 * Response fields actually present (no invented fields): an_dt (company's
 * declared announcement time), exchdisstime (exchange disclosure time),
 * desc (a real NSE-defined subject/category — observed values include
 * "Outcome of Board Meeting", "Press Release", "Credit Rating", "General
 * Updates", ...), attchmntText (free-text detail), attchmntFile (PDF URL),
 * seq_id (NSE's own identifier), sm_isin, sm_name, symbol.
 *
 * NSE does not expose a separate short "title" field distinct from `desc` —
 * `desc` is the closest thing to a headline this source provides, so it's
 * used for both `title` and `announcementType` rather than fabricating a
 * more specific title.
 */

const NSE_BASE_URL = "https://www.nseindia.com";

function browserHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
  };
}

export class NseAnnouncementsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "NseAnnouncementsError";
  }
}

export interface NseAnnouncementRow {
  an_dt: string;
  exchdisstime: string | null;
  desc: string;
  attchmntText: string | null;
  attchmntFile: string | null;
  seq_id: string;
  sm_isin: string;
  sm_name: string;
  symbol: string;
}

export class NseAnnouncementsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchAnnouncements(symbol: string, fromDate: string, toDate: string): Promise<{ rows: NseAnnouncementRow[]; raw: unknown }> {
    const url = `${NSE_BASE_URL}/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}&from_date=${fromDate}&to_date=${toDate}`;
    const response = await this.fetchImpl(url, { headers: browserHeaders() });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new RateLimitedError(`NSE rate limit hit for ${symbol}`, retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined);
    }
    if (!response.ok) {
      throw new NseAnnouncementsError(`NSE announcements request failed for ${symbol}: HTTP ${response.status}`, response.status);
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      throw new NseAnnouncementsError(`Unexpected NSE announcements response shape for ${symbol}: expected an array`);
    }
    return { rows: raw as NseAnnouncementRow[], raw };
  }
}

export interface ParsedNseAnnouncement {
  title: string;
  description: string | null;
  announcementType: string;
  announcementDate: Date;
  sourceUrl: string;
  externalId: string;
  rawReference: string;
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

/** Parses NSE's "DD-Mon-YYYY HH:MM:SS" announcement timestamp format. */
export function parseNseDateTime(raw: string): Date {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Unrecognized NSE datetime format: "${raw}"`);
  }
  const [, day, monAbbrev, year, hour, minute, second] = match;
  const month = MONTH_ABBREVIATIONS[monAbbrev.toLowerCase()];
  if (month === undefined) {
    throw new Error(`Unrecognized month abbreviation in NSE datetime: "${raw}"`);
  }
  return new Date(Date.UTC(Number(year), month, Number(day), Number(hour), Number(minute), Number(second)));
}

/**
 * Normalizes one raw NSE announcement row. Returns null when the row has no
 * attachment URL — sourceUrl is required (it's the dedup key), and NSE
 * doesn't provide any other stable per-announcement URL to fall back to, so
 * a row without one is skipped rather than given a fabricated URL.
 */
export function parseNseAnnouncement(row: NseAnnouncementRow): ParsedNseAnnouncement | null {
  if (!row.attchmntFile) return null;

  return {
    title: row.desc,
    description: row.attchmntText,
    announcementType: row.desc,
    announcementDate: parseNseDateTime(row.exchdisstime ?? row.an_dt),
    sourceUrl: row.attchmntFile,
    externalId: row.seq_id,
    rawReference: row.attchmntFile,
  };
}
