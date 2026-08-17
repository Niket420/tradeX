import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * BSE corporate-announcements client.
 *
 * CONFIRMED against live bseindia.com (2026-08-17), found in the same
 * Angular bundle as bseMarketData.ts:
 *   GET https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w
 *     ?pageno=1&strCat=-1&strPrevDate=<YYYYMMDD>&strScrip=<BSE_CODE>
 *     &strSearch=P&strToDate=<YYYYMMDD>&strType=C&subcategory=-1
 * Verified live for RELIANCE (BSE code 500325): returned the same real
 * Reliance/Rolls-Royce announcement independently ingested from NSE on the
 * same date, confirming cross-source consistency.
 *
 * Attachment URLs: the response's ATTACHMENTNAME field does NOT map to a
 * publicly-downloadable file the way it first appears — the bundle's own
 * `/xml-data/corpfiling/CorpAttachment/{year}/{month}/{name}` construction
 * redirects to a member-login page (verified: HTTP 301 to
 * bseindia.com/members/showinterest). The bundle's url-map also has an
 * "AttachLive" fragment (`/xml-data/corpfiling/AttachLive/{name}`), but
 * testing showed it 404s for some announcements that turn out to have moved
 * to a separate "AttachHis" (historical) path — even for filings only days
 * old. AttachHis was verified to serve BOTH a same-week filing and a
 * days-old one that AttachLive 404'd on, so it's used exclusively here as
 * the more complete/reliable path:
 *   https://www.bseindia.com/xml-data/corpfiling/AttachHis/{ATTACHMENTNAME}
 */

const BSE_BASE_URL = "https://api.bseindia.com/BseIndiaAPI/api";
const BSE_ATTACHMENT_BASE_URL = "https://www.bseindia.com/xml-data/corpfiling/AttachHis";

function browserHeaders(referer: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: referer,
  };
}

export class BseAnnouncementsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "BseAnnouncementsError";
  }
}

export interface BseAnnouncementRow {
  NEWSID: string;
  SCRIP_CD: number;
  NEWSSUB: string;
  DT_TM: string;
  NEWS_DT: string;
  ATTACHMENTNAME: string | null;
  MORE: string | null;
  HEADLINE: string | null;
  CATEGORYNAME: string | null;
}

export class BseAnnouncementsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(options: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchAnnouncements(bseCode: string, fromDateYYYYMMDD: string, toDateYYYYMMDD: string): Promise<{ rows: BseAnnouncementRow[]; raw: unknown }> {
    const referer = `https://www.bseindia.com/stock-share-price/x/x/${bseCode}/corp-announcements/`;
    const url = `${BSE_BASE_URL}/AnnSubCategoryGetData/w?pageno=1&strCat=-1&strPrevDate=${fromDateYYYYMMDD}&strScrip=${encodeURIComponent(bseCode)}&strSearch=P&strToDate=${toDateYYYYMMDD}&strType=C&subcategory=-1`;
    const response = await this.fetchImpl(url, { headers: browserHeaders(referer) });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new RateLimitedError(`BSE rate limit hit for ${bseCode}`, retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined);
    }
    if (!response.ok) {
      throw new BseAnnouncementsError(`BSE announcements request failed for ${bseCode}: HTTP ${response.status}`, response.status);
    }

    const raw = await response.json();
    const table = (raw as Record<string, unknown>)?.Table;
    if (!Array.isArray(table)) {
      // BSE returns {"Table":[],"Table1":[...]} even for zero results, not an error shape.
      return { rows: [], raw };
    }
    return { rows: table as BseAnnouncementRow[], raw };
  }
}

export interface ParsedBseAnnouncement {
  title: string;
  description: string | null;
  announcementType: string;
  announcementDate: Date;
  sourceUrl: string;
  externalId: string;
}

/** Returns null (skip) when there's no attachment — sourceUrl is required and is the dedup key, so a row without a real file isn't fabricated a URL. */
export function parseBseAnnouncement(row: BseAnnouncementRow): ParsedBseAnnouncement | null {
  if (!row.ATTACHMENTNAME) return null;
  const date = new Date(row.DT_TM ?? row.NEWS_DT);
  if (Number.isNaN(date.getTime())) return null;

  return {
    title: row.NEWSSUB,
    description: row.MORE ?? row.HEADLINE,
    announcementType: row.CATEGORYNAME ?? "Uncategorized",
    announcementDate: date,
    sourceUrl: `${BSE_ATTACHMENT_BASE_URL}/${row.ATTACHMENTNAME}`,
    externalId: row.NEWSID,
  };
}
