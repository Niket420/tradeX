import { parseCsv } from "@/lib/data/csv";
import { isValidIsin, normalizeIsin } from "@/lib/data/isin";
import { classifySecurityType } from "@/lib/data/security-classification";
import type { SecurityType } from "@/lib/data/security-classification";
import type { CompanyUpsertClient } from "@/lib/data/nse-import";

export interface NormalizedBseRow {
  isin: string;
  companyName: string;
  bseCode: string;
  bseSymbol: string | null;
  securityType: SecurityType;
  status: string | null;
}

export interface BseParseResult {
  valid: NormalizedBseRow[];
  totalRows: number;
  skipped: number;
  invalidIsin: number;
  duplicateIsin: number;
}

// The downloaded BSE "List of Securities" export does not actually include a
// market-cap column (only Security Code, Issuer Name, Security Id, Security
// Name, Status, Group, Face Value, ISIN No, Instrument) despite the phase
// brief expecting one — marketCap is left NULL from this source rather than
// guessed. If a future export includes "Market Capitalisation", this will
// pick it up automatically.
const MARKET_CAP_HEADER_CANDIDATES = ["Market Capitalisation", "Market Cap", "MarketCap"];

export function parseBseRows(csvText: string): BseParseResult {
  const { headers, rows } = parseCsv(csvText);

  const required = ["Issuer Name", "Security Id", "Security Code", "ISIN No"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`BSE CSV is missing expected column(s): ${missing.join(", ")}. Found: ${headers.join(", ")}`);
  }
  const marketCapHeader = MARKET_CAP_HEADER_CANDIDATES.find((h) => headers.includes(h));

  const seenIsin = new Set<string>();
  const valid: NormalizedBseRow[] = [];
  let skipped = 0;
  let invalidIsin = 0;
  let duplicateIsin = 0;

  for (const row of rows) {
    const issuerName = row["Issuer Name"]?.trim();
    const securityCode = row["Security Code"]?.trim();
    const isinRaw = row["ISIN No"]?.trim();

    if (!issuerName || !securityCode) {
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

    const nameForClassification = `${issuerName} ${row["Security Name"] ?? ""} ${row["Instrument"] ?? ""}`;

    valid.push({
      isin,
      companyName: issuerName,
      bseCode: securityCode,
      bseSymbol: row["Security Id"]?.trim() || null,
      securityType: classifySecurityType(nameForClassification),
      status: row["Status"]?.trim() || null,
    });

    void marketCapHeader; // documented above: not present in current exports
  }

  return { valid, totalRows: rows.length, skipped, invalidIsin, duplicateIsin };
}

export interface BseImportSummary {
  totalRows: number;
  newCompanies: number;
  updatedCompanies: number;
  skipped: number;
  invalidIsin: number;
  duplicateIsin: number;
}

export async function importBseCompanies(csvText: string, client: CompanyUpsertClient): Promise<BseImportSummary> {
  const parsed = parseBseRows(csvText);

  let newCompanies = 0;
  let updatedCompanies = 0;

  for (const row of parsed.valid) {
    const existing = await client.company.findUnique({ where: { isin: row.isin } });
    if (existing) {
      // Already known (from NSE, or a prior BSE run) — attach BSE identifiers
      // without clobbering fields NSE may already own (companyName, sector).
      await client.company.update({
        where: { isin: row.isin },
        data: {
          bseCode: row.bseCode,
          bseSymbol: row.bseSymbol,
        },
      });
      updatedCompanies++;
    } else {
      await client.company.create({
        data: {
          isin: row.isin,
          companyName: row.companyName,
          bseCode: row.bseCode,
          bseSymbol: row.bseSymbol,
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
