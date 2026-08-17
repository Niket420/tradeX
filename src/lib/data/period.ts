export type PeriodType = "QUARTERLY" | "ANNUAL";

export interface DerivedPeriod {
  period: string;
  periodType: PeriodType;
  fiscalYear: number;
  fiscalQuarter: number | null;
}

const QUARTERLY_PATTERN = /^Q([1-4])\s*FY\s*(\d{4})$/i;
const ANNUAL_PATTERN = /^FY\s*(\d{4})$/i;

/**
 * Parses a period string like "Q3 FY2025" or "FY2025" into structured
 * fiscal-year/quarter fields. Throws rather than guessing when the format
 * doesn't match anything recognized — fiscalYear is a required column, so an
 * unparseable period must fail that company's ingestion, not silently
 * record a wrong year.
 */
export function deriveFinancialPeriod(rawPeriod: string | null): DerivedPeriod {
  if (!rawPeriod) {
    throw new Error("Stoxim response did not include a period — cannot derive fiscalYear without one.");
  }
  const trimmed = rawPeriod.trim();

  const quarterly = QUARTERLY_PATTERN.exec(trimmed);
  if (quarterly) {
    return {
      period: `Q${quarterly[1]} FY${quarterly[2]}`,
      periodType: "QUARTERLY",
      fiscalYear: Number(quarterly[2]),
      fiscalQuarter: Number(quarterly[1]),
    };
  }

  const annual = ANNUAL_PATTERN.exec(trimmed);
  if (annual) {
    return {
      period: `FY${annual[1]}`,
      periodType: "ANNUAL",
      fiscalYear: Number(annual[1]),
      fiscalQuarter: null,
    };
  }

  throw new Error(`Unrecognized period format from Stoxim: "${rawPeriod}"`);
}
