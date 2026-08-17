import { parseCsv } from "@/lib/data/csv";
import { isValidIsin, normalizeIsin } from "@/lib/data/isin";
import { classifySecurityType } from "@/lib/data/security-classification";
import type { SecurityType } from "@/lib/data/security-classification";

export interface NormalizedNseRow {
  isin: string;
  companyName: string;
  nseSymbol: string;
  securityType: SecurityType;
  /** NSE's SERIES column (e.g. "EQ", "BE") — the closest thing this file has to a status. */
  status: string | null;
}

export interface NseParseResult {
  valid: NormalizedNseRow[];
  totalRows: number;
  skipped: number;
  invalidIsin: number;
  duplicateIsin: number;
}

/**
 * Pure CSV -> normalized rows. No I/O, fully unit-testable. Duplicate ISINs
 * within the file keep the first occurrence and count the rest as duplicates
 * (never silently overwritten, never inserted twice).
 */
export function parseNseRows(csvText: string): NseParseResult {
  const { headers, rows } = parseCsv(csvText);

  const required = ["SYMBOL", "NAME OF COMPANY", "ISIN NUMBER"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`NSE CSV is missing expected column(s): ${missing.join(", ")}. Found: ${headers.join(", ")}`);
  }

  const seenIsin = new Set<string>();
  const valid: NormalizedNseRow[] = [];
  let skipped = 0;
  let invalidIsin = 0;
  let duplicateIsin = 0;

  for (const row of rows) {
    const symbol = row["SYMBOL"]?.trim();
    const name = row["NAME OF COMPANY"]?.trim();
    const isinRaw = row["ISIN NUMBER"]?.trim();

    if (!symbol || !name) {
      skipped++;
      continue;
    }
    if (!isValidIsin(isinRaw)) {
      invalidIsin++;
      continue;
    }

    const isin = normalizeIsin(isinRaw);
    if (seenIsin.has(isin)) {
      duplicateIsin++;
      continue;
    }
    seenIsin.add(isin);

    valid.push({
      isin,
      companyName: name,
      nseSymbol: symbol,
      securityType: classifySecurityType(name),
      status: row["SERIES"]?.trim() || null,
    });
  }

  return { valid, totalRows: rows.length, skipped, invalidIsin, duplicateIsin };
}

export interface NseImportSummary {
  totalRows: number;
  newCompanies: number;
  updatedCompanies: number;
  skipped: number;
  invalidIsin: number;
  duplicateIsin: number;
}

/**
 * Minimal slice of PrismaClient this importer needs — keeps it mockable in
 * tests. `data` is intentionally untyped here (rather than a generic
 * Record<string, unknown>): Prisma's real client methods require specific
 * input types with required fields, which can't structurally satisfy a
 * broader parameter type, so the real PrismaClient wouldn't be assignable
 * to this interface otherwise. Call sites still pass well-typed objects.
 */
export interface CompanyUpsertClient {
  company: {
    findUnique: (args: { where: { isin: string } }) => Promise<{ id: string } | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (args: { data: any }) => Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (args: { where: { isin: string }; data: any }) => Promise<unknown>;
  };
}

export async function importNseCompanies(csvText: string, client: CompanyUpsertClient): Promise<NseImportSummary> {
  const parsed = parseNseRows(csvText);

  let newCompanies = 0;
  let updatedCompanies = 0;

  for (const row of parsed.valid) {
    const existing = await client.company.findUnique({ where: { isin: row.isin } });
    if (existing) {
      await client.company.update({
        where: { isin: row.isin },
        data: {
          companyName: row.companyName,
          nseSymbol: row.nseSymbol,
          securityType: row.securityType,
          status: row.status,
        },
      });
      updatedCompanies++;
    } else {
      await client.company.create({
        data: {
          isin: row.isin,
          companyName: row.companyName,
          nseSymbol: row.nseSymbol,
          securityType: row.securityType,
          status: row.status,
        },
      });
      newCompanies++;
    }
  }

  return {
    totalRows: parsed.totalRows,
    newCompanies,
    updatedCompanies,
    skipped: parsed.skipped,
    invalidIsin: parsed.invalidIsin,
    duplicateIsin: parsed.duplicateIsin,
  };
}
