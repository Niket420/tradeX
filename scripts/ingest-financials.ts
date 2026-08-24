/**
 * Fetch companies' quarterly financial results from NSE (real XBRL filings,
 * not Stoxim) and store them as FinancialStatement rows.
 *
 * Usage:
 *   npm run ingest:financials -- --isin=INE002A01018            (latest quarter only)
 *   npm run ingest:financials -- --isin=INE002A01018 --history  (multiple historical quarters, Standalone+Consolidated)
 *   npm run ingest:financials -- --limit=20
 *   npm run ingest:financials -- --limit=20 --history
 *
 * If neither --limit nor --isin is given, defaults to --limit=10 (never "all").
 * Incremental: an already-stored (period, statementType, source) combination
 * is skipped without re-fetching its XBRL document, so reruns are cheap and
 * safe to interrupt.
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import {
  NseFinancialsClient,
  NseApiError,
  parseXbrlFinancialResult,
  deriveNsePeriod,
  pickLatestResultWithXbrl,
  pickHistoricalResultsWithXbrl,
  mapStatementType,
  type NseFinancialResultRow,
} from "@/lib/data/nse/nseFinancials";
import { saveRawResponse, saveRawText } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_PERIODS = 20;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; nseSymbol: string | null };

async function upsertFinancialStatement(companyId: string, row: NseFinancialResultRow, xbrlXml: string, xbrlRawPath: string): Promise<"inserted" | "updated"> {
  const period = deriveNsePeriod(row);
  const statementType = mapStatementType(row.consolidated);
  const parsed = parseXbrlFinancialResult(xbrlXml);

  const values = {
    revenue: parsed.revenue,
    ebitda: parsed.ebitda,
    ebit: parsed.ebit,
    pat: parsed.pat,
    eps: parsed.eps,
    totalAssets: parsed.totalAssets,
    totalLiabilities: parsed.totalLiabilities,
    totalDebt: parsed.totalDebt,
    cash: parsed.cash,
    operatingCashFlow: parsed.operatingCashFlow,
    investingCashFlow: parsed.investingCashFlow,
    financingCashFlow: parsed.financingCashFlow,
    roe: parsed.roe,
    roce: parsed.roce,
    pe: parsed.pe,
    pb: parsed.pb,
    debtEquity: parsed.debtEquity,
  };

  const existing = await prisma.financialStatement.findUnique({
    where: { companyId_period_statementType_source: { companyId, period: period.period, statementType, source: "nse" } },
    select: { id: true },
  });

  await prisma.financialStatement.upsert({
    where: { companyId_period_statementType_source: { companyId, period: period.period, statementType, source: "nse" } },
    create: {
      companyId,
      period: period.period,
      periodType: period.periodType,
      fiscalYear: period.fiscalYear,
      fiscalQuarter: period.fiscalQuarter,
      statementType,
      ...values,
      source: "nse",
      rawResponsePath: xbrlRawPath,
      lastSuccessfulFetchAt: new Date(),
    },
    update: {
      ...values,
      rawResponsePath: xbrlRawPath,
      lastFetchedAt: new Date(),
      lastSuccessfulFetchAt: new Date(),
    },
  });

  return existing ? "updated" : "inserted";
}

// --- Single-latest-quarter mode (original, unchanged behavior) ---

type LatestOutcome = { status: "success"; period: string; wasNew: boolean } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

async function ingestLatestForCompany(company: CompanyRef): Promise<LatestOutcome> {
  if (!company.nseSymbol) {
    return { status: "skipped", reason: "no NSE symbol on record" };
  }

  const client = new NseFinancialsClient();

  let listResult;
  try {
    listResult = await client.fetchQuarterlyResults(company.nseSymbol);
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseApiError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `results list fetch failed: ${reason}` };
  }

  saveRawResponse("nse-financials-list", company.isin, listResult.raw);

  const latest = pickLatestResultWithXbrl(listResult.rows);
  if (!latest) {
    return { status: "skipped", reason: "no filing with a usable XBRL link" };
  }

  let period;
  try {
    period = deriveNsePeriod(latest);
  } catch (error) {
    return { status: "failed", reason: `could not derive period: ${error instanceof Error ? error.message : String(error)}` };
  }

  const statementType = mapStatementType(latest.consolidated);
  const existing = await prisma.financialStatement.findUnique({
    where: { companyId_period_statementType_source: { companyId: company.id, period: period.period, statementType, source: "nse" } },
    select: { id: true, source: true },
  });
  if (existing) {
    return { status: "skipped", reason: `already have ${period.period} (${statementType}) from NSE` };
  }

  let xbrlXml: string;
  try {
    xbrlXml = await client.fetchXbrl(latest.xbrl!);
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseApiError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `XBRL fetch failed: ${reason}` };
  }

  const xbrlRawPath = saveRawText("nse-financials-xbrl", company.isin, xbrlXml, "xml");
  const result = await upsertFinancialStatement(company.id, latest, xbrlXml, xbrlRawPath);

  return { status: "success", period: period.period, wasNew: result === "inserted" };
}

// --- Historical multi-quarter mode ---

type HistoryOutcome =
  | { status: "success"; discovered: number; inserted: number; updated: number; skipped: number; failed: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

async function ingestHistoryForCompany(company: CompanyRef, maxPeriods: number): Promise<HistoryOutcome> {
  if (!company.nseSymbol) {
    return { status: "skipped", reason: "no NSE symbol on record" };
  }

  const client = new NseFinancialsClient();

  let listResult;
  try {
    listResult = await client.fetchQuarterlyResults(company.nseSymbol);
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseApiError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `results list fetch failed: ${reason}` };
  }

  saveRawResponse("nse-financials-list", company.isin, listResult.raw);

  const candidates = pickHistoricalResultsWithXbrl(listResult.rows, maxPeriods);
  if (candidates.length === 0) {
    return { status: "skipped", reason: "no filings with a usable XBRL link" };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of candidates) {
    let period;
    let statementType: "STANDALONE" | "CONSOLIDATED";
    try {
      period = deriveNsePeriod(row);
      statementType = mapStatementType(row.consolidated);
    } catch {
      failed++;
      continue;
    }

    const existing = await prisma.financialStatement.findUnique({
      where: { companyId_period_statementType_source: { companyId: company.id, period: period.period, statementType, source: "nse" } },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const xbrlXml = await client.fetchXbrl(row.xbrl!);
      const xbrlRawPath = saveRawText("nse-financials-xbrl", company.isin, xbrlXml, "xml");
      const result = await upsertFinancialStatement(company.id, row, xbrlXml, xbrlRawPath);
      if (result === "inserted") inserted++;
      else updated++;
    } catch (error) {
      if (error instanceof RateLimitedError) throw error;
      failed++;
    }
    // Pace requests within a single company's history fetch too, not just between companies.
    await new Promise((resolve) => setTimeout(resolve, RETRY_OPTIONS.minIntervalMs));
  }

  return { status: "success", discovered: candidates.length, inserted, updated, skipped, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const isinArg = typeof args.isin === "string" ? args.isin.toUpperCase() : null;
  const limit = typeof args.limit === "string" ? Number(args.limit) : isinArg ? 1 : DEFAULT_LIMIT;
  const history = args.history === true;
  const maxPeriods = typeof args["max-periods"] === "string" ? Number(args["max-periods"]) : DEFAULT_MAX_PERIODS;

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(`Invalid --limit value: ${args.limit}`);
    process.exitCode = 1;
    return;
  }
  if (!isinArg && !args.limit) {
    console.log(`No --limit or --isin given — defaulting to --limit=${DEFAULT_LIMIT} (this never fetches the whole universe).`);
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
    console.error(isinArg ? `No company found with ISIN ${isinArg}. Run ingest:nse / ingest:bse first.` : "No companies with an NSE symbol found. Run ingest:nse first.");
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching ${history ? `up to ${maxPeriods} historical periods` : "the latest quarter"} for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from NSE.\n`);

  const run = await startIngestionRun("NSE", history ? "FINANCIAL_RESULTS_HISTORY" : "FINANCIAL_RESULTS", { isin: isinArg, limit, history, maxPeriods });

  let companiesFailed = 0;
  let statementsDiscovered = 0;

  if (history) {
    await runSequentially(
      companies,
      (company) => ingestHistoryForCompany(company, maxPeriods),
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
          statementsDiscovered += outcome.discovered;
          console.log(`${label}\n  ${outcome.discovered} period(s) found: ${outcome.inserted} inserted, ${outcome.updated} updated, ${outcome.skipped} skipped, ${outcome.failed} failed`);
          for (let i = 0; i < outcome.inserted; i++) run.noteInserted();
          for (let i = 0; i < outcome.updated; i++) run.noteUpdated();
          for (let i = 0; i < outcome.skipped; i++) run.noteSkipped();
          for (let i = 0; i < outcome.failed; i++) run.noteFailed();
          if (outcome.failed > 0 && outcome.inserted === 0 && outcome.updated === 0 && outcome.skipped === 0) companiesFailed++;
        } else if (outcome.status === "skipped") {
          console.log(`${label}\n  SKIPPED: ${outcome.reason}`);
        } else {
          console.log(`${label}\n  FAILED: ${outcome.reason}`);
          companiesFailed++;
        }
      },
      RETRY_OPTIONS
    );
  } else {
    await runSequentially(
      companies,
      (company) => ingestLatestForCompany(company),
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
          statementsDiscovered += 1;
          console.log(`${label}\n  SUCCESS: ${outcome.period}${outcome.wasNew ? "" : " (updated)"}`);
          if (outcome.wasNew) run.noteInserted();
          else run.noteUpdated();
        } else if (outcome.status === "skipped") {
          console.log(`${label}\n  SKIPPED: ${outcome.reason}`);
          run.noteSkipped();
        } else {
          console.log(`${label}\n  FAILED: ${outcome.reason}`);
          companiesFailed++;
          run.noteFailed();
        }
      },
      RETRY_OPTIONS
    );
  }

  await run.finish(companiesFailed === 0 ? "SUCCESS" : companiesFailed === companies.length ? "FAILED" : "PARTIAL");

  console.log("\nFinancial ingestion complete");
  console.log("-----------------------------");
  console.log(`Companies processed  : ${companies.length}`);
  console.log(`Companies failed     : ${companiesFailed}`);
  if (history) console.log(`Statements discovered: ${statementsDiscovered}`);
  console.log(`Statements inserted  : ${run.recordsInserted}`);
  console.log(`Statements updated   : ${run.recordsUpdated}`);
  console.log(`Statements skipped   : ${run.recordsSkipped}`);
  console.log(`Statements failed    : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("Financial ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
