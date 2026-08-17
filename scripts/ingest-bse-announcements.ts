/**
 * Fetch corporate announcements from BSE and store as Announcement rows.
 * For BSE-only companies (no NSE symbol).
 *
 * Usage:
 *   npm run ingest:bse-announcements -- --isin=<ISIN> --days=90
 *   npm run ingest:bse-announcements -- --limit=20
 */
import { prisma } from "@/lib/db/prisma";
import { parseArgs } from "@/lib/data/cli-args";
import { BseAnnouncementsClient, BseAnnouncementsError, parseBseAnnouncement } from "@/lib/data/bse/bseAnnouncements";
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

type CompanyRef = { id: string; isin: string; companyName: string; bseCode: string | null };

function toYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function ingestOneCompany(
  company: CompanyRef,
  days: number
): Promise<{ status: "success"; upserted: number } | { status: "skipped"; reason: string } | { status: "failed"; reason: string }> {
  if (!company.bseCode) {
    return { status: "skipped", reason: "no BSE code on record" };
  }

  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);

  const existingInWindow = await prisma.announcement.findFirst({
    where: { companyId: company.id, source: "bse", announcementDate: { gte: fromDate } },
    select: { id: true },
  });
  if (existingInWindow) {
    return { status: "skipped", reason: "already have announcements in this window" };
  }

  const client = new BseAnnouncementsClient();
  let result;
  try {
    result = await client.fetchAnnouncements(company.bseCode, toYYYYMMDD(fromDate), toYYYYMMDD(toDate));
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    const reason = error instanceof BseAnnouncementsError ? error.message : error instanceof Error ? error.message : String(error);
    return { status: "failed", reason: `announcements fetch failed: ${reason}` };
  }

  saveRawResponse("bse-announcements", company.isin, result.raw);

  if (result.rows.length === 0) {
    return { status: "skipped", reason: "no announcements in range" };
  }

  let upserted = 0;
  for (const row of result.rows) {
    const parsed = parseBseAnnouncement(row);
    if (!parsed) continue;
    await prisma.announcement.upsert({
      where: { companyId_sourceUrl: { companyId: company.id, sourceUrl: parsed.sourceUrl } },
      create: {
        companyId: company.id,
        title: parsed.title,
        description: parsed.description,
        announcementType: parsed.announcementType,
        announcementDate: parsed.announcementDate,
        source: "bse",
        sourceUrl: parsed.sourceUrl,
        externalId: parsed.externalId,
        rawReference: parsed.sourceUrl,
      },
      update: {
        title: parsed.title,
        description: parsed.description,
        announcementType: parsed.announcementType,
        announcementDate: parsed.announcementDate,
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
  const days = typeof args.days === "string" ? Number(args.days) : DEFAULT_DAYS;

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

  console.log(`Fetching last ${days} days of announcements for ${companies.length} compan${companies.length === 1 ? "y" : "ies"} from BSE.\n`);

  const run = await startIngestionRun("BSE", "ANNOUNCEMENTS", { isin: isinArg, limit, days });

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
        console.log(`${label}\n  SUCCESS: ${outcome.upserted} announcement(s) upserted`);
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

  console.log("\nBSE announcement ingestion complete");
  console.log("-------------------------------------");
  console.log(`Processed: ${run.recordsProcessed}`);
  console.log(`Succeeded: ${run.recordsInserted}`);
  console.log(`Skipped  : ${run.recordsSkipped}`);
  console.log(`Failed   : ${run.recordsFailed}`);
}

main()
  .catch((err) => {
    console.error("BSE announcement ingestion crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
