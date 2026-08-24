import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * NSE shareholding-pattern client.
 *
 * CONFIRMED against live nseindia.com (2026-08-17), found via the real
 * "Shareholding Pattern" corporate-filings page and its actual JS
 * (`dist/js/sections/corporate-filings.js`, the same bundle that revealed
 * the financial-results and announcements endpoints):
 *   GET /api/corporate-share-holdings-master?index=equities&symbol=<SYMBOL>
 * Verified live for RELIANCE: returned 22 real historical quarterly
 * filings (list endpoint), each with a real `xbrl` link to a structured
 * filing document (SEBI's "in-bse-shp" shareholding-pattern taxonomy,
 * distinct from the "in-bse-fin" financials one).
 *
 * List response fields used: `date` (period-end, e.g. "30-JUN-2026"),
 * `pr_and_prgrp` (Promoter+Group %, matches XBRL exactly — cross-checked:
 * list said 50.48, XBRL ShareholdingOfPromoterAndPromoterGroup tag said
 * 0.5048), `public_val` (Public %), `xbrl` (per-filing detail document).
 *
 * XBRL detail fields used (all share one tag name,
 * `ShareholdingAsAPercentageOfTotalNumberOfShares`, distinguished by
 * contextRef suffix). CONFIRMED TWO TAXONOMY VERSIONS by directly comparing
 * RELIANCE's 12 most recent real filings (5 newer, 7 older — this is not
 * assumed, it's why every raw XBRL response gets saved and was diffed):
 *   Newer (contextRef ends "_ContextI"), value is a 0-1 fraction:
 *     ShareholdingOfPromoterAndPromoterGroup_ContextI, PublicShareholding_ContextI,
 *     InstitutionsForeign_ContextI, InstitutionsDomestic_ContextI, MutualFundsOrUTI_ContextI
 *   Older (contextRef ends plain "I", no underscore), value is already 0-100:
 *     ShareholdingOfPromoterAndPromoterGroupI, PublicShareholdingI,
 *     InstitutionsForeignI, InstitutionsDomesticI, MutualFundsOrUtiI
 *   Verified the older values are internally consistent (Promoter 50.11 +
 *   Public 49.89 = 100.00 exactly) confirming they're already percentages,
 *   not fractions — so this parser tries the newer context first, then the
 *   older one, and only multiplies by 100 for the newer (fraction) form.
 * Pledge: `WhetherAnySharesHeldByPromotersAreEncumberedUnderPledged` is a
 * boolean ("true"/"false"). When false, pledgedPercentage is a real 0 (not
 * missing data). No numeric pledge-percentage tag was found in the real
 * documents tested (Reliance has zero pledged shares in all 12) — a company
 * that actually has pledged shares hasn't been tested, so pledgedPercentage
 * stays null when the flag is true rather than guessing a tag name.
 */

const NSE_BASE_URL = "https://www.nseindia.com";

function browserHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
  };
}

export class NseShareholdingError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "NseShareholdingError";
  }
}

export interface NseShareholdingListRow {
  date: string;
  broadcastDate: string;
  pr_and_prgrp: string;
  public_val: string;
  symbol: string;
  xbrl: string | null;
}

export class NseShareholdingClient {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchShareholdingList(symbol: string): Promise<{ rows: NseShareholdingListRow[]; raw: unknown }> {
    const url = `${NSE_BASE_URL}/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`;
    const response = await this.fetchImpl(url, { headers: browserHeaders(), signal: AbortSignal.timeout(30000) });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new RateLimitedError(`NSE rate limit hit for ${symbol}`, retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined);
    }
    if (!response.ok) {
      throw new NseShareholdingError(`NSE shareholding request failed for ${symbol}: HTTP ${response.status}`, response.status);
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      throw new NseShareholdingError(`Unexpected NSE shareholding response shape for ${symbol}: expected an array`);
    }
    return { rows: raw as NseShareholdingListRow[], raw };
  }

  async fetchXbrl(url: string): Promise<string> {
    const response = await this.fetchImpl(url, { headers: browserHeaders(), signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      throw new NseShareholdingError(`Failed to fetch NSE shareholding XBRL at ${url}: HTTP ${response.status}`, response.status);
    }
    return response.text();
  }
}

export interface ParsedNseShareholding {
  promoterHolding: number | null;
  publicHolding: number | null;
  fiiHolding: number | null;
  diiHolding: number | null;
  mutualFundHolding: number | null;
  pledgedPercentage: number | null;
}

const SHP_TAG = "ShareholdingAsAPercentageOfTotalNumberOfShares";

function readShpFactRaw(xml: string, contextRef: string): number | null {
  const pattern = new RegExp(`<in-bse-shp:${SHP_TAG}[^>]*\\bcontextRef="${contextRef}"[^>]*>([^<]*)</in-bse-shp:${SHP_TAG}>`);
  const match = pattern.exec(xml);
  if (!match) return null;
  const value = Number(match[1].trim());
  return Number.isFinite(value) ? value : null;
}

/**
 * Reads one shareholding percentage field, trying the newer contextRef
 * first (value is a 0-1 fraction, scaled ×100) then the older one (value is
 * already 0-100) — see module doc comment for how both were confirmed.
 */
function readShpFact(xml: string, newerContextRef: string, olderContextRef: string): number | null {
  const newer = readShpFactRaw(xml, newerContextRef);
  if (newer !== null) return newer * 100;
  const older = readShpFactRaw(xml, olderContextRef);
  if (older !== null) return older;
  return null;
}

function readBooleanFlag(xml: string, tag: string): boolean | null {
  const pattern = new RegExp(`<in-bse-shp:${tag}[^>]*>([^<]*)</in-bse-shp:${tag}>`);
  const match = pattern.exec(xml);
  if (!match) return null;
  const value = match[1].trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** Parses one NSE shareholding-pattern XBRL document. See module doc comment for tag/contextRef mapping and the pledge-percentage caveat. */
export function parseXbrlShareholding(xml: string): ParsedNseShareholding {
  const pledgeFlag = readBooleanFlag(xml, "WhetherAnySharesHeldByPromotersAreEncumberedUnderPledged");

  return {
    promoterHolding: readShpFact(xml, "ShareholdingOfPromoterAndPromoterGroup_ContextI", "ShareholdingOfPromoterAndPromoterGroupI"),
    publicHolding: readShpFact(xml, "PublicShareholding_ContextI", "PublicShareholdingI"),
    fiiHolding: readShpFact(xml, "InstitutionsForeign_ContextI", "InstitutionsForeignI"),
    diiHolding: readShpFact(xml, "InstitutionsDomestic_ContextI", "InstitutionsDomesticI"),
    mutualFundHolding: readShpFact(xml, "MutualFundsOrUTI_ContextI", "MutualFundsOrUtiI"),
    pledgedPercentage: pledgeFlag === false ? 0 : null,
  };
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

/** Parses NSE's "DD-MON-YYYY" shareholding date format (e.g. "30-JUN-2026"). */
export function parseNseShareholdingDate(raw: string): Date {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Unrecognized NSE shareholding date format: "${raw}"`);
  }
  const [, day, monAbbrev, year] = match;
  const month = MONTH_ABBREVIATIONS[monAbbrev.toLowerCase()];
  if (month === undefined) {
    throw new Error(`Unrecognized month abbreviation in NSE shareholding date: "${raw}"`);
  }
  return new Date(Date.UTC(Number(year), month, Number(day)));
}

/** Picks up to `maxPeriods` rows with a usable XBRL link, most-recent first (list is already most-recent-first). */
export function pickShareholdingHistoryWithXbrl(rows: NseShareholdingListRow[], maxPeriods = 12): NseShareholdingListRow[] {
  return rows.filter((row) => row.xbrl && row.xbrl.trim() !== "" && row.xbrl !== "-").slice(0, maxPeriods);
}
