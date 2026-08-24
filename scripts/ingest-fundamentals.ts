/**
 * Fetch fundamentals from Stoxim for a controlled subset of companies and
 * store them as FinancialStatement rows. Deliberately bounded — this must
 * never fire an unbounded number of requests against a metered API.
 *
 * Usage:
 *   npm run ingest:fundamentals -- --limit=20
 *   npm run ingest:fundamentals -- --limit=100
 *   npm run ingest:fundamentals -- --isin=INE009A01021
 *
 * If neither --limit nor --isin is given, defaults to --limit=10 (never "all").
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { StoximClient, StoximApiError, type StoximFinancials } from "@/lib/data/stoxim";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { saveRawResponse } from "@/lib/data/raw-storage";
import { deriveFinancialPeriod } from "@/lib/data/period";

const DEFAULT_LIMIT = 10;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 300,
  maxRetries: 4,
  baseDelayMs: 1500,
};

async function upsertFinancialStatement(companyId: string, f: StoximFinancials, rawResponsePath: string) {
  const { period, periodType, fiscalYear, fiscalQuarter } = deriveFinancialPeriod(f.period);

  const values = {
    revenue: f.revenue,
    ebitda: f.ebitda,
    ebit: f.ebit,
    pat: f.pat,
    eps: f.eps,
    totalAssets: f.totalAssets,
    totalLiabilities: f.totalLiabilities,
    totalDebt: f.totalDebt,
    cash: f.cash,
    operatingCashFlow: f.operatingCashFlow,
    investingCashFlow: f.investingCashFlow,
    financingCashFlow: f.financingCashFlow,
    roe: f.roe,
    roce: f.roce,
    pe: f.pe,
    pb: f.pb,
    debtEquity: f.debtEquity,
  };

  // Stoxim doesn't distinguish standalone/consolidated, so statementType
  // stays null for this source (see StatementType doc comment in schema) —
  // Prisma's compound-unique upsert doesn't accept a null key component, so
  // this uses findFirst + create/update instead.
  const existing = await prisma.financialStatement.findFirst({
    where: { companyId, period, statementType: null, source: "stoxim" },
    select: { id: true },
  });

  if (existing) {
    await prisma.financialStatement.update({
      where: { id: existing.id },
      data: { ...values, rawResponsePath, lastFetchedAt: new Date(), lastSuccessfulFetchAt: new Date() },
    });
  } else {
    await prisma.financialStatement.create({
      data: { companyId, period, periodType, fiscalYear, fiscalQuarter, ...values, source: "stoxim", rawResponsePath, lastSuccessfulFetchAt: new Date() },
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.STOXIM_API_KEY;

  if (!apiKey) {
    console.error("STOXIM_API_KEY is not set in .env.local. Sign up at https://www.stoxim.com and add the key there.");
    process.exitCode = 1;
    return;
  }

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

  const companies = isinArg
    ? await prisma.company.findMany({ where: { isin: isinArg }, select: { id: true, isin: true, companyName: true } })
    : await prisma.company.findMany({
        where: { securityType: "COMMON_EQUITY" },
        select: { id: true, isin: true, companyName: true },
        take: limit,
        orderBy: { companyName: "asc" },
      });

  if (companies.length === 0) {
    console.error(isinArg ? `No company found with ISIN ${isinArg}. Run ingest:nse / ingest:bse first.` : "No companies in the database. Run ingest:nse / ingest:bse first.");
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching fundamentals for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from Stoxim.\n`);

  const client = new StoximClient({ apiKey });

  let successCount = 0;
  let failureCount = 0;

  await runSequentially(
    companies,
    async (company) => {
      const { parsed, raw } = await client.getFinancials(company.isin);
      const rawPath = saveRawResponse("stoxim", company.isin, raw);
      await upsertFinancialStatement(company.id, parsed, rawPath);
      return parsed;
    },
    (company, index, result) => {
      const label = `[${index + 1}/${companies.length}] ${company.companyName} (${company.isin})`;
      if (result.ok) {
        console.log(`${label}\nFetching fundamentals... Success (period: ${result.value.period ?? "unknown"})\n`);
        successCount++;
      } else {
        const error = result.error;
        const reason =
          error instanceof RateLimitedError
            ? "Rate limited — retries exhausted"
            : error instanceof StoximApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : String(error);
        console.log(`${label}\nFetching fundamentals... FAILED: ${reason}\n`);
        failureCount++;
      }
    },
    RETRY_OPTIONS
  );

  console.log("Fundamentals ingestion complete");
  console.log("--------------------------------");
  console.log(`Succeeded: ${successCount}`);
  console.log(`Failed   : ${failureCount}`);
}

main()
  .catch((err) => {
    console.error("Fundamentals ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
