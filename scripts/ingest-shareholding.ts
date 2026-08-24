/**
 * Fetch shareholding-pattern history from NSE and store as Shareholding rows.
 *
 * Usage:
 *   npm run ingest:shareholding -- --isin=INE002A01018
 *   npm run ingest:shareholding -- --limit=20
 *
 * If neither --limit nor --isin is given, defaults to --limit=10.
 * Incremental: an already-stored (asOfDate, source) combination is skipped
 * without re-fetching its XBRL document.
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { NseShareholdingClient, NseShareholdingError, parseXbrlShareholding, parseNseShareholdingDate, pickShareholdingHistoryWithXbrl } from "@/lib/data/nse/nseShareholding";
import { saveRawResponse, saveRawText } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_PERIODS = 12;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; nseSymbol: string | null };

type Outcome =
  | { status: "success"; discovered: number; inserted: number; updated: number; skipped: number; failed: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

async function ingestOneCompany(company: CompanyRef, maxPeriods: number): Promise<Outcome> {
  if (!company.nseSymbol) {
    return { status: "skipped", reason: "no NSE symbol on record" };
  }

  const client = new NseShareholdingClient();
  let listResult;
  try {
    listResult = await client.fetchShareholdingList(company.nseSymbol);
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseShareholdingError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `shareholding list fetch failed: ${reason}` };
  }

  saveRawResponse("nse-shareholding-list", company.isin, listResult.raw);

  const candidates = pickShareholdingHistoryWithXbrl(listResult.rows, maxPeriods);
  if (candidates.length === 0) {
    return { status: "skipped", reason: "no filings with a usable XBRL link" };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of candidates) {
    let asOfDate: Date;
    try {
      asOfDate = parseNseShareholdingDate(row.date);
    } catch {
      failed++;
      continue;
    }

    const existing = await prisma.shareholding.findUnique({
      where: { companyId_asOfDate_source: { companyId: company.id, asOfDate, source: "nse" } },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const xbrlXml = await client.fetchXbrl(row.xbrl!);
      const xbrlRawPath = saveRawText("nse-shareholding-xbrl", company.isin, xbrlXml, "xml");
      const parsed = parseXbrlShareholding(xbrlXml);

      await prisma.shareholding.create({
        data: {
          companyId: company.id,
          asOfDate,
          promoterHolding: parsed.promoterHolding,
          publicHolding: parsed.publicHolding,
          fiiHolding: parsed.fiiHolding,
          diiHolding: parsed.diiHolding,
          mutualFundHolding: parsed.mutualFundHolding,
          pledgedPercentage: parsed.pledgedPercentage,
          source: "nse",
          rawResponsePath: xbrlRawPath,
        },
      });
      inserted++;
    } catch (error) {
      if (error instanceof RateLimitedError) throw error;
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_OPTIONS.minIntervalMs));
  }

  return { status: "success", discovered: candidates.length, inserted, updated, skipped, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const isinArg = typeof args.isin === "string" ? args.isin.toUpperCase() : null;
  const limit = typeof args.limit === "string" ? Number(args.limit) : isinArg ? 1 : DEFAULT_LIMIT;
  const maxPeriods = typeof args["max-periods"] === "string" ? Number(args["max-periods"]) : DEFAULT_MAX_PERIODS;

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(`Invalid --limit value: ${args.limit}`);
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

  console.log(`Fetching up to ${maxPeriods} shareholding periods for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from NSE.\n`);

  const run = await startIngestionRun("NSE", "SHAREHOLDING", { isin: isinArg, limit, maxPeriods });

  let companiesFailed = 0;

  await runSequentially(
    companies,
    (company) => ingestOneCompany(company, maxPeriods),
    (company, index, result) => {
      const label = `[${index + 1}/${companies.length}] ${company.companyName} (${company.isin})`;
      run.noteProcessed();
      if (!result.ok) {
        const error = result.error;
        const reason = error instanceof RateLimitedError ? "Rate limited — retries exhausted" : error instanceof Error ? error.message : String(error);
        console.log(`${label}\n  FAILED: ${reason}`);
        companiesFailed++;
        return;
      }
      const outcome = result.value;
      if (outcome.status === "success") {
        console.log(`${label}\n  ${outcome.discovered} period(s) found: ${outcome.inserted} inserted, ${outcome.skipped} skipped, ${outcome.failed} failed`);
        for (let i = 0; i < outcome.inserted; i++) run.noteInserted();
        for (let i = 0; i < outcome.skipped; i++) run.noteSkipped();
        for (let i = 0; i < outcome.failed; i++) run.noteFailed();
        if (outcome.failed > 0 && outcome.inserted === 0 && outcome.skipped === 0) companiesFailed++;
      } else if (outcome.status === "skipped") {
        console.log(`${label}\n  SKIPPED: ${outcome.reason}`);
      } else {
        console.log(`${label}\n  FAILED: ${outcome.reason}`);
        companiesFailed++;
      }
    },
    RETRY_OPTIONS
  );

  await run.finish(companiesFailed === 0 ? "SUCCESS" : companiesFailed === companies.length ? "FAILED" : "PARTIAL");

  console.log("\nShareholding ingestion complete");
  console.log("---------------------------------");
  console.log(`Companies processed: ${companies.length}`);
  console.log(`Companies failed   : ${companiesFailed}`);
  console.log(`Records inserted   : ${run.recordsInserted}`);
  console.log(`Records skipped    : ${run.recordsSkipped}`);
  console.log(`Records failed     : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("Shareholding ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
