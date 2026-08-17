/**
 * Fetch daily close-price history from BSE and store as PriceHistory rows.
 * For BSE-only companies (no NSE symbol) — see bseMarketData.ts for why
 * open/high/low stay NULL for these rows (BSE's public endpoint only gives
 * a single daily price, not full OHLC).
 *
 * Usage:
 *   npm run ingest:bse-prices -- --isin=<ISIN>
 *   npm run ingest:bse-prices -- --limit=20
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { BseMarketDataClient, BseMarketDataError, parseBsePricePoint } from "@/lib/data/bse/bseMarketData";
import { saveRawResponse } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; bseCode: string | null };

async function ingestOneCompany(company: CompanyRef): Promise<{ status: "success"; rowsUpserted: number } | { status: "skipped"; reason: string } | { status: "failed"; reason: string }> {
  if (!company.bseCode) {
    return { status: "skipped", reason: "no BSE code on record" };
  }

  const recentCutoff = new Date();
  recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 3);
  const existingRecent = await prisma.priceHistory.findFirst({
    where: { companyId: company.id, source: "bse", date: { gte: recentCutoff } },
    select: { id: true },
  });
  if (existingRecent) {
    return { status: "skipped", reason: "already have recent price data" };
  }

  const client = new BseMarketDataClient();
  let result;
  try {
    result = await client.getHistoricalPrices(company.bseCode, "3M");
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof BseMarketDataError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `historical-price fetch failed: ${reason}` };
  }

  saveRawResponse("bse-prices", company.isin, result.raw);

  if (result.points.length === 0) {
    return { status: "skipped", reason: "no trading days in range" };
  }

  let upserted = 0;
  for (const point of result.points) {
    const parsed = parseBsePricePoint(point);
    if (!parsed) continue;
    await prisma.priceHistory.upsert({
      where: { companyId_date_source: { companyId: company.id, date: parsed.date, source: "bse" } },
      create: {
        companyId: company.id,
        date: parsed.date,
        open: null,
        high: null,
        low: null,
        close: parsed.close,
        adjustedClose: null,
        volume: BigInt(Math.round(parsed.volume)),
        tradedValue: null,
        source: "bse",
      },
      update: {
        close: parsed.close,
        volume: BigInt(Math.round(parsed.volume)),
      },
    });
    upserted++;
  }

  return { status: "success", rowsUpserted: upserted };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const isinArg = typeof args.isin === "string" ? args.isin.toUpperCase() : null;
  const limit = typeof args.limit === "string" ? Number(args.limit) : isinArg ? 1 : DEFAULT_LIMIT;

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(`Invalid --limit value: ${args.limit}`);
    process.exitCode = 1;
    return;
  }
  if (!isinArg && !args.limit) {
    console.log(`No --limit or --isin given — defaulting to --limit=${DEFAULT_LIMIT}.`);
  }

  const companies: CompanyRef[] = isinArg
    ? await prisma.company.findMany({ where: { isin: isinArg }, select: { id: true, isin: true, companyName: true, bseCode: true } })
    : await prisma.company.findMany({
        where: { securityType: { in: ["COMMON_EQUITY", "ETF"] }, bseCode: { not: null }, nseSymbol: null },
        select: { id: true, isin: true, companyName: true, bseCode: true },
        take: limit,
        orderBy: { companyName: "asc" },
      });

  if (companies.length === 0) {
    console.error(isinArg ? `No company found with ISIN ${isinArg}.` : "No companies with a BSE code found.");
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching prices for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from BSE.\n`);

  const run = await startIngestionRun("BSE", "PRICES", { isin: isinArg, limit });

  await runSequentially(
    companies,
    (company) => ingestOneCompany(company),
    (company, index, result) => {
      const label = `[${index + 1}/${companies.length}] ${company.companyName} (${company.isin})`;
      run.noteProcessed();
      if (!result.ok) {
        const error = result.error;
        const reason = error instanceof RateLimitedError ? "Rate limited — retries exhausted" : error instanceof Error ? error.message : String(error);
        console.log(`${label}\n  FAILED: ${reason}`);
        run.noteFailed();
        return;
      }
      const outcome = result.value;
      if (outcome.status === "success") {
        console.log(`${label}\n  SUCCESS: ${outcome.rowsUpserted} day(s) upserted`);
        run.noteInserted();
      } else if (outcome.status === "skipped") {
        console.log(`${label}\n  SKIPPED: ${outcome.reason}`);
        run.noteSkipped();
      } else {
        console.log(`${label}\n  FAILED: ${outcome.reason}`);
        run.noteFailed();
      }
    },
    RETRY_OPTIONS
  );

  await run.finish(run.recordsFailed === 0 ? "SUCCESS" : run.recordsFailed === run.recordsProcessed ? "FAILED" : "PARTIAL");

  console.log("\nBSE price ingestion complete");
  console.log("------------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Succeeded: ${run.recordsInserted}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("BSE price ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
