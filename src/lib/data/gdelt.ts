import { RateLimitedError } from "@/lib/data/rate-limiter";

/**
 * GDELT DOC 2.0 API client — public, documented, keyless news search.
 * https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 *
 * GET https://api.gdeltproject.org/api/v2/doc/doc
 *   ?query=<search terms>&mode=artlist&format=json&maxrecords=<n>&sort=hybridrel
 *
 * Response (mode=artlist&format=json): `{ articles: [{ url, title, seendate
 * ("YYYYMMDDTHHMMSSZ"), domain, language, sourcecountry }] }`. This is
 * GDELT's own documented schema (a stable public API, not reverse-engineered
 * from a site's JS like the NSE clients), so field names come directly from
 * their docs rather than a live capture.
 *
 * IMPORTANT: GDELT enforces a real ~1 request/5 seconds rate limit — this
 * environment's shared outbound IP was already being rate-limited (HTTP 429
 * with GDELT's own "limit requests to one every 5 seconds" message) even on
 * a single, isolated first request, most likely from other concurrent
 * traffic sharing the same egress IP. That response *confirms* the endpoint
 * and rate-limit are real and live; it does not by itself confirm a
 * live 200 response was captured in this environment. searchCompanyNews
 * throws RateLimitedError on 429 exactly like the NSE clients, so callers
 * (runSequentially) retry with backoff rather than treating it as fatal.
 *
 * Only metadata is stored (title/url/domain/date/language/country) — never
 * the full article body, per the ingestion plan's news-storage rule.
 */

const GDELT_BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

export class GdeltApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GdeltApiError";
  }
}

export interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

export interface SearchCompanyNewsOptions {
  maxRecords?: number;
  fetchImpl?: typeof fetch;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchCompanyNews(companyName: string, options: SearchCompanyNewsOptions = {}): Promise<{ articles: GdeltArticle[]; raw: unknown }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRecords = options.maxRecords ?? 25;

  const query = `"${companyName}"`;
  const url = `${GDELT_BASE_URL}?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${maxRecords}&sort=hybridrel`;

  // GDELT's host has shown genuine transient connection timeouts (not rate
  // limiting — a raw TCP connect timeout) independent of the 429 case
  // below. Retry those a couple of times with a short delay; this is
  // ordinary network-flakiness handling, not a rate-limit backoff.
  let response: Response;
  const maxNetworkAttempts = 3;
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
      break;
    } catch (error) {
      if (attempt >= maxNetworkAttempts) {
        throw new GdeltApiError(`GDELT request failed for "${companyName}" after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(2000 * attempt);
    }
  }

  if (response.status === 429) {
    throw new RateLimitedError(`GDELT rate limit hit for "${companyName}"`, 5000);
  }
  if (!response.ok) {
    throw new GdeltApiError(`GDELT request failed for "${companyName}": HTTP ${response.status}`, response.status);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // GDELT returns plain-text rate-limit/error notices with a 200 status
    // sometimes, not just 429 — a JSON parse failure means we got one of
    // those, not a real empty result set.
    throw new GdeltApiError(`GDELT returned a non-JSON response for "${companyName}": ${text.slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new GdeltApiError(`Unexpected GDELT response shape for "${companyName}"`);
  }
  const articles = (parsed as Record<string, unknown>).articles;
  if (!Array.isArray(articles)) {
    // An empty/no-match result from GDELT omits `articles` entirely rather
    // than returning `[]` — that's a valid "no news found", not an error.
    return { articles: [], raw: parsed };
  }
  return { articles: articles as GdeltArticle[], raw: parsed };
}

export interface ParsedGdeltArticle {
  title: string;
  url: string;
  sourceDomain: string | null;
  publishedAt: Date | null;
  language: string | null;
  sourceCountry: string | null;
}

/** Parses GDELT's "YYYYMMDDTHHMMSSZ" seendate format. Returns null (not a fabricated date) when unparseable. */
function parseGdeltSeenDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(raw);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
}

/** Normalizes one raw GDELT article into NewsArticle-shaped fields. */
export function parseGdeltArticle(article: GdeltArticle): ParsedGdeltArticle {
  return {
    title: article.title,
    url: article.url,
    sourceDomain: article.domain ?? null,
    publishedAt: parseGdeltSeenDate(article.seendate),
    language: article.language ?? null,
    sourceCountry: article.sourcecountry ?? null,
  };
}
