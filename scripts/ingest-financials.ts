/**
 * Fetch companies' latest quarterly financial results from NSE (real XBRL
 * filings, not Stoxim) and store them as FinancialStatement rows.
 *
 * Usage:
 *   npm run ingest:financials -- --isin=INE002A01018
 *   npm run ingest:financials -- --limit=20
 *
 * If neither --limit nor --isin is given, defaults to --limit=10 (never "all").
 * Incremental: a company whose latest available NSE period is already stored
 * (source="nse") is skipped without re-fetching its XBRL document.
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { NseFinancialsClient, NseApiError, parseXbrlFinancialResult, deriveNsePeriod, pickLatestResultWithXbrl } from "@/lib/data/nse/nseFinancials";
import { saveRawResponse, saveRawText } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; nseSymbol: string | null };

type IngestOutcome = { status: "success"; period: string; wasNew: boolean } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

async function ingestOneCompany(company: CompanyRef): Promise<IngestOutcome> {
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

  const existing = await prisma.financialStatement.findUnique({
    where: { companyId_period: { companyId: company.id, period: period.period } },
    select: { id: true, source: true },
  });
  if (existing && existing.source === "nse") {
    return { status: "skipped", reason: `already have ${period.period} from NSE` };
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
  const parsed = parseXbrlFinancialResult(xbrlXml);

  await prisma.financialStatement.upsert({
    where: { companyId_period: { companyId: company.id, period: period.period } },
    create: {
      companyId: company.id,
      period: period.period,
      periodType: period.periodType,
      fiscalYear: period.fiscalYear,
      fiscalQuarter: period.fiscalQuarter,
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
      source: "nse",
      rawResponsePath: xbrlRawPath,
      lastSuccessfulFetchAt: new Date(),
    },
    update: {
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
      source: "nse",
      rawResponsePath: xbrlRawPath,
      lastFetchedAt: new Date(),
      lastSuccessfulFetchAt: new Date(),
    },
  });

  return { status: "success", period: period.period, wasNew: !existing };
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

  console.log(`Fetching financial results for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from NSE.\n`);

  const run = await startIngestionRun("NSE", "FINANCIAL_RESULTS", { isin: isinArg, limit });

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
        console.log(`${label}\n  SUCCESS: ${outcome.period}${outcome.wasNew ? "" : " (updated)"}`);
        if (outcome.wasNew) run.noteInserted();
        else run.noteUpdated();
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

  console.log("\nFinancial ingestion complete");
  console.log("-----------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Inserted : ${run.recordsInserted}`);
  console.log(`Updated  : ${run.recordsUpdated}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("Financial ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
