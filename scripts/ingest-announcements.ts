/**
 * Fetch corporate announcements from NSE and store as Announcement rows.
 *
 * Usage:
 *   npm run ingest:announcements -- --isin=INE002A01018 --days=90
 *   npm run ingest:announcements -- --limit=20
 *
 * If neither --limit nor --isin is given, defaults to --limit=10.
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { NseAnnouncementsClient, NseAnnouncementsError, parseNseAnnouncement } from "@/lib/data/nse/nseAnnouncements";
import { formatNseDate } from "@/lib/data/nse/nseMarketData";
import { saveRawResponse } from "@/lib/data/raw-storage";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";
import { startIngestionRun } from "@/lib/data/ingestion-run";

const DEFAULT_LIMIT = 10;
const DEFAULT_DAYS = 90;

const RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 800,
  maxRetries: 3,
  baseDelayMs: 2000,
};

type CompanyRef = { id: string; isin: string; companyName: string; nseSymbol: string | null };

async function ingestOneCompany(
  company: CompanyRef,
  days: number
): Promise<{ status: "success"; upserted: number; skippedNoAttachment: number } | { status: "skipped"; reason: string } | { status: "failed"; reason: string }> {
  if (!company.nseSymbol) {
    return { status: "skipped", reason: "no NSE symbol on record" };
  }

  const client = new NseAnnouncementsClient();
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);

  // Resume support: if we already captured an announcement inside this
  // window for this company, treat it as already covered from a prior run.
  // Companies with genuinely zero real announcements in the window get
  // re-checked on resume (a cheap request), which is an acceptable tradeoff
  // for not needing a separate "already checked" marker in the schema.
  const existingInWindow = await prisma.announcement.findFirst({
    where: { companyId: company.id, source: "nse", announcementDate: { gte: fromDate } },
    select: { id: true },
  });
  if (existingInWindow) {
    return { status: "skipped", reason: "already have announcements in this window" };
  }

  let result;
  try {
    result = await client.fetchAnnouncements(company.nseSymbol, formatNseDate(fromDate), formatNseDate(toDate));
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof NseAnnouncementsError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `announcements fetch failed: ${reason}` };
  }

  saveRawResponse("nse-announcements", company.isin, result.raw);

  if (result.rows.length === 0) {
    return { status: "skipped", reason: "no announcements in range" };
  }

  let upserted = 0;
  let skippedNoAttachment = 0;
  for (const row of result.rows) {
    const parsed = parseNseAnnouncement(row);
    if (!parsed) {
      skippedNoAttachment++;
      continue;
    }
    await prisma.announcement.upsert({
      where: { companyId_sourceUrl: { companyId: company.id, sourceUrl: parsed.sourceUrl } },
      create: {
        companyId: company.id,
        title: parsed.title,
        description: parsed.description,
        announcementType: parsed.announcementType,
        announcementDate: parsed.announcementDate,
        source: "nse",
        sourceUrl: parsed.sourceUrl,
        externalId: parsed.externalId,
        rawReference: parsed.rawReference,
      },
      update: {
        title: parsed.title,
        description: parsed.description,
        announcementType: parsed.announcementType,
        announcementDate: parsed.announcementDate,
        externalId: parsed.externalId,
        rawReference: parsed.rawReference,
      },
    });
    upserted++;
  }

  return { status: "success", upserted, skippedNoAttachment };
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

  console.log(`Fetching last ${days} days of announcements for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from NSE.\n`);

  const run = await startIngestionRun("NSE", "ANNOUNCEMENTS", { isin: isinArg, limit, days });

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
        console.log(`${label}\n  SUCCESS: ${outcome.upserted} announcement(s) upserted${outcome.skippedNoAttachment ? `, ${outcome.skippedNoAttachment} skipped (no attachment URL)` : ""}`);
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

  console.log("\nAnnouncement ingestion complete");
  console.log("---------------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Succeeded: ${run.recordsInserted}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("Announcement ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
