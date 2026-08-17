/**
 * Import the BSE "List of Securities" export into PostgreSQL, matching
 * against existing NSE-sourced companies by ISIN.
 *
 * Usage:
 *   npm run ingest:bse
 *   npm run ingest:bse -- --csv=path/to/other.csv
 *   BSE_CSV_PATH=path/to/other.csv npm run ingest:bse
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db/prisma";
import { importBseCompanies } from "@/lib/data/bse-import";
import { parseArgs } from "@/lib/data/cli-args";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = resolve(
    process.cwd(),
    (typeof args.csv === "string" && args.csv) || process.env.BSE_CSV_PATH || "company_info/BSE.csv"
  );

  console.log(`Reading BSE CSV: ${csvPath}`);
  const csvText = readFileSync(csvPath, "utf8");

  const summary = await importBseCompanies(csvText, prisma);

  console.log("\nBSE import complete");
  console.log("--------------------");
  console.log(`Total rows processed : ${summary.totalRows}`);
  console.log(`New companies        : ${summary.newCompanies}`);
  console.log(`Updated companies    : ${summary.updatedCompanies}`);
  console.log(`Skipped rows         : ${summary.skipped}`);
  console.log(`Invalid/missing ISIN : ${summary.invalidIsin}`);
  console.log(`Duplicate ISINs      : ${summary.duplicateIsin}`);

  const [nseCount, bseCount, bothCount, onlyNseCount, onlyBseCount, totalCount] = await Promise.all([
    prisma.company.count({ where: { nseSymbol: { not: null } } }),
    prisma.company.count({ where: { bseCode: { not: null } } }),
    prisma.company.count({ where: { nseSymbol: { not: null }, bseCode: { not: null } } }),
    prisma.company.count({ where: { nseSymbol: { not: null }, bseCode: null } }),
    prisma.company.count({ where: { bseCode: { not: null }, nseSymbol: null } }),
    prisma.company.count(),
  ]);

  console.log("\nCross-exchange universe");
  console.log("------------------------");
  console.log(`NSE companies         : ${nseCount}`);
  console.log(`BSE companies         : ${bseCount}`);
  console.log(`Present on both       : ${bothCount}`);
  console.log(`Only NSE              : ${onlyNseCount}`);
  console.log(`Only BSE              : ${onlyBseCount}`);
  console.log(`Final unique company count: ${totalCount}`);
}

main()
  .catch((err) => {
    console.error("BSE import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
