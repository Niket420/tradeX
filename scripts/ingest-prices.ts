/**
 * Fetch daily OHLCV price history from NSE and store as PriceHistory rows.
 *
 * Usage:
 *   npm run ingest:prices -- --isin=INE002A01018 --days=365
 *   npm run ingest:prices -- --limit=20 --days=365
 *
 * If neither --limit nor --isin is given, defaults to --limit=10.
 * --days defaults to 365 (~1 year). Requests longer than ~70 trading days
 * are automatically chunked — see getHistoricalPricesChunked doc comment.
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { NseMarketDataClient, NseMarketDataError, parseNsePriceRow } from "@/lib/data/nse/nseMarketData";
import { saveRawResponse } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;
const DEFAULT_DAYS = 365;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; nseSymbol: string | null };

async function ingestOneCompany(company: CompanyRef, days: number): Promise<{ status: "success"; rowsUpserted: number } | { status: "skipped"; reason: string } | { status: "failed"; reason: string }> {
  if (!company.nseSymbol) {
    return { status: "skipped", reason: "no NSE symbol on record" };
  }

  const client = new NseMarketDataClient();
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);

  // Resume support: skip only if we already have BOTH a recent row (within
  // the last 3 days, allowing for a weekend/holiday gap) AND a row reaching
  // back close to the start of the requested window — i.e. the requested
  // depth of history is actually covered, not just "some" recent data.
  // Without the depth check, a company with only 30 days of history would
  // wrongly skip a later --days=365 backfill just for having a recent row.
  const recentCutoff = new Date(toDate);
  recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 3);
  const oldestNeededCutoff = new Date(toDate);
  oldestNeededCutoff.setUTCDate(oldestNeededCutoff.getUTCDate() - days + 5);
  const [existingRecent, existingDeepEnough] = await Promise.all([
    prisma.priceHistory.findFirst({ where: { companyId: company.id, source: "nse", date: { gte: recentCutoff } }, select: { id: true } }),
    prisma.priceHistory.findFirst({ where: { companyId: company.id, source: "nse", date: { lte: oldestNeededCutoff } }, select: { id: true } }),
  ]);
  if (existingRecent && existingDeepEnough) {
    return { status: "skipped", reason: "already have recent price data covering the requested window" };
  }

  // NSE caps each request to ~70 trading days regardless of the requested
  // range (verified, not documented — see nseMarketData.ts doc comment);
  // anything longer needs multiple chunked requests.
  let result;
  try {
    result = days > 80 ? await client.getHistoricalPricesChunked(company.nseSymbol, fromDate, toDate) : await client.getHistoricalPrices(company.nseSymbol, fromDate, toDate);
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseMarketDataError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `historical-price fetch failed: ${reason}` };
  }

  saveRawResponse("nse-prices", company.isin, result.raw);

  if (result.rows.length === 0) {
    return { status: "skipped", reason: "no trading days in range" };
  }

  let upserted = 0;
  for (const row of result.rows) {
    const parsed = parseNsePriceRow(row);
    await prisma.priceHistory.upsert({
      where: { companyId_date_source: { companyId: company.id, date: parsed.date, source: "nse" } },
      create: {
        companyId: company.id,
        date: parsed.date,
        open: parsed.open,
        high: parsed.high,
        low: parsed.low,
        close: parsed.close,
        adjustedClose: parsed.adjustedClose,
        volume: BigInt(Math.round(parsed.volume)),
        tradedValue: parsed.tradedValue,
        source: "nse",
      },
      update: {
        open: parsed.open,
        high: parsed.high,
        low: parsed.low,
        close: parsed.close,
        adjustedClose: parsed.adjustedClose,
        volume: BigInt(Math.round(parsed.volume)),
        tradedValue: parsed.tradedValue,
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
  const days = typeof args.days === "string" ? Number(args.days) : DEFAULT_DAYS;

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(`Invalid --limit value: ${args.limit}`);
    process.exitCode = 1;
    return;
  }
  if (!Number.isFinite(days) || days <= 0) {
    console.error(`Invalid --days value: ${args.days}`);
    process.exitCode = 1;
    return;
  }
  if (!isinArg && !args.limit) {
    console.log(`No --limit or --isin given — defaulting to --limit=${DEFAULT_LIMIT}.`);
  }

  const companies: CompanyRef[] = isinArg
    ? await prisma.company.findMany({ where: { isin: isinArg }, select: { id: true, isin: true, companyName: true, nseSymbol: true } })
    : await prisma.company.findMany({
        where: { securityType: "COMMON_EQUITY", nseSymbol: { not: null } },
        select: { id: true, isin: true, companyName: true, nseSymbol: true },
        take: limit,
        orderBy: { companyName: "asc" },
      });

  if (companies.length === 0) {
    console.error(isinArg ? `No company found with ISIN ${isinArg}.` : "No companies with an NSE symbol found. Run ingest:nse first.");
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching last ${days} days of prices for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from NSE.\n`);

  const run = await startIngestionRun("NSE", "PRICES", { isin: isinArg, limit, days });

  await runSequentially(
    companies,
    (company) => ingestOneCompany(company, days),
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

  console.log("\nPrice ingestion complete");
  console.log("-------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Succeeded: ${run.recordsInserted}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("Price ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
