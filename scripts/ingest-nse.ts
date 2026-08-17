/**
 * Import the NSE equity security list into PostgreSQL.
 *
 * Usage:
 *   npm run ingest:nse
 *   npm run ingest:nse -- --csv=path/to/other.csv
 *   NSE_CSV_PATH=path/to/other.csv npm run ingest:nse
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db/prisma";
import { importNseCompanies } from "@/lib/data/nse-import";
import { parseArgs } from "@/lib/data/cli-args";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = resolve(
    process.cwd(),
    (typeof args.csv === "string" && args.csv) || process.env.NSE_CSV_PATH || "company_info/NSE.csv"
  );

  console.log(`Reading NSE CSV: ${csvPath}`);
  const csvText = readFileSync(csvPath, "utf8");

  const summary = await importNseCompanies(csvText, prisma);

  console.log("\nNSE import complete");
  console.log("--------------------");
  console.log(`Total rows processed : ${summary.totalRows}`);
  console.log(`New companies        : ${summary.newCompanies}`);
  console.log(`Updated companies    : ${summary.updatedCompanies}`);
  console.log(`Skipped rows         : ${summary.skipped}`);
  console.log(`Invalid/missing ISIN : ${summary.invalidIsin}`);
  console.log(`Duplicate ISINs      : ${summary.duplicateIsin}`);
}

main()
  .catch((err) => {
    console.error("NSE import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
