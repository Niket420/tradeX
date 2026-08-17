import { prisma } from "@/lib/db/prisma";
import type { RealPriceRow } from "@/components/real-price-columns";

interface RawRow {
  isin: string;
  companyName: string;
  nseSymbol: string | null;
  bseCode: string | null;
  bseSymbol: string | null;
  sector: string | null;
  latestDate: Date;
  latestClose: string;
  latestVolume: string;
  latestSource: string;
  prevClose: string | null;
}

/**
 * One row per company's most recent PriceHistory entry (plus the prior
 * trading day's close, for 1D % change) — a lateral join rather than N+1
 * queries, since this covers ~5,000 companies. Real data only: a company
 * with no PriceHistory rows simply doesn't appear here.
 */
export async function getAllRealPrices(): Promise<RealPriceRow[]> {
  try {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        c."isin", c."companyName", c."nseSymbol", c."bseCode", c."bseSymbol", c."sector",
        latest."date" AS "latestDate", latest."close"::text AS "latestClose",
        latest."volume"::text AS "latestVolume", latest."source" AS "latestSource",
        prev."close"::text AS "prevClose"
      FROM "Company" c
      JOIN LATERAL (
        SELECT * FROM "PriceHistory" ph WHERE ph."companyId" = c."id" ORDER BY ph."date" DESC LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT * FROM "PriceHistory" ph WHERE ph."companyId" = c."id" AND ph."date" < latest."date" ORDER BY ph."date" DESC LIMIT 1
      ) prev ON true
      ORDER BY latest."date" DESC, c."companyName" ASC
    `;

    return rows.map((r) => {
      const close = Number(r.latestClose);
      const prev = r.prevClose !== null ? Number(r.prevClose) : null;
      return {
        isin: r.isin,
        companyName: r.companyName,
        nseSymbol: r.nseSymbol,
        bseCode: r.bseCode,
        bseSymbol: r.bseSymbol,
        sector: r.sector,
        latestDate: r.latestDate.toISOString(),
        latestClose: close,
        latestVolume: Number(r.latestVolume),
        latestSource: r.latestSource,
        change1dPct: prev !== null && prev !== 0 ? ((close - prev) / prev) * 100 : null,
      };
    });
  } catch {
    return [];
  }
}
