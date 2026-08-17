/**
 * Fetch recent news for a company from GDELT (keyless, public) and store as
 * NewsArticle rows — metadata only, never full article bodies.
 *
 * Usage:
 *   npm run ingest:news -- --isin=INE002A01018
 *   npm run ingest:news -- --limit=10
 *
 * GDELT enforces ~1 request/5 seconds — this script paces requests well
 * under that limit and backs off on 429 rather than hammering it.
 * If neither --limit nor --isin is given, defaults to --limit=5 (news
 * ingestion is intentionally the most conservative of all the ingest
 * scripts — a small test set first, not a firehose).
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { searchCompanyNews, parseGdeltArticle, GdeltApiError } from "@/lib/data/gdelt";
import { saveRawResponse } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 5;
const MAX_RECORDS_PER_COMPANY = 15;

// GDELT's real-world limit is ~1 req/5s; pace well under that.
const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 6000,
  maxRetries: 3,
  baseDelayMs: 6000,
};

type CompanyRef = { id: string; isin: string; companyName: string };

async function ingestOneCompany(company: CompanyRef): Promise<{ status: "success"; upserted: number } | { status: "skipped"; reason: string } | { status: "failed"; reason: string }> {
  let result;
  try {
    result = await searchCompanyNews(company.companyName, { maxRecords: MAX_RECORDS_PER_COMPANY });
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof GdeltApiError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `GDELT search failed: ${reason}` };
  }

  saveRawResponse("gdelt", company.isin, result.raw);

  if (result.articles.length === 0) {
    return { status: "skipped", reason: "no articles found" };
  }

  let upserted = 0;
  for (const article of result.articles) {
    const parsed = parseGdeltArticle(article);
    if (!parsed.url || !parsed.title) continue;
    await prisma.newsArticle.upsert({
      where: { companyId_url: { companyId: company.id, url: parsed.url } },
      create: {
        companyId: company.id,
        title: parsed.title,
        url: parsed.url,
        sourceDomain: parsed.sourceDomain,
        publishedAt: parsed.publishedAt,
        language: parsed.language,
        sourceCountry: parsed.sourceCountry,
      },
      update: {
        title: parsed.title,
        sourceDomain: parsed.sourceDomain,
        publishedAt: parsed.publishedAt,
        language: parsed.language,
        sourceCountry: parsed.sourceCountry,
      },
    });
    upserted++;
  }

  return { status: "success", upserted };
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
    console.log(`No --limit or --isin given — defaulting to --limit=${DEFAULT_LIMIT} (news ingestion starts conservative).`);
  }

  const companies: CompanyRef[] = isinArg
    ? await prisma.company.findMany({ where: { isin: isinArg }, select: { id: true, isin: true, companyName: true } })
    : await prisma.company.findMany({
        where: { securityType: "COMMON_EQUITY" },
        select: { id: true, isin: true, companyName: true },
        take: limit,
        orderBy: { companyName: "asc" },
      });

  if (companies.length === 0) {
    console.error(isinArg ? `No company found with ISIN ${isinArg}.` : "No companies found. Run ingest:nse / ingest:bse first.");
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching news for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from GDELT (paced at 1 request/6s).\n`);

  const run = await startIngestionRun("GDELT", "NEWS", { isin: isinArg, limit });

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
        console.log(`${label}\n  SUCCESS: ${outcome.upserted} article(s) upserted`);
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

  console.log("\nNews ingestion complete");
  console.log("-------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Succeeded: ${run.recordsInserted}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("News ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
