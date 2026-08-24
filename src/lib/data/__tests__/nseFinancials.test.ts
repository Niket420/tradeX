import { describe, expect, it } from "vitest";
import { parseXbrlFinancialResult, deriveNsePeriod, pickLatestResultWithXbrl, pickHistoricalResultsWithXbrl, mapStatementType, type NseFinancialResultRow } from "@/lib/data/nse/nseFinancials";

// Minimal fixture using the real tag names/namespace confirmed against live
// NSE XBRL filings (RELIANCE Q3 FY2025, TCS Q3 FY2025) — see nseFinancials.ts
// doc comment. Trimmed to just the facts the parser reads, plus a FourD
// (cumulative) context to verify it's correctly ignored.
function xbrlFixture(overrides: { revenue?: string; pat?: string; eps?: string; debtEquity?: string } = {}): string {
  const revenue = overrides.revenue ?? "1282600000000.00";
  const pat = overrides.pat ?? "87210000000.00";
  const eps = overrides.eps ?? "6.44";
  const debtEquity = overrides.debtEquity ?? "0.00";

  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:in-bse-fin="http://www.bseindia.com/xbrl/fin/2020-03-31/in-bse-fin" xmlns:xbrli="http://www.xbrl.org/2003/instance">
<xbrli:context id="OneD"><xbrli:period><xbrli:startDate>2024-10-01</xbrli:startDate><xbrli:endDate>2024-12-31</xbrli:endDate></xbrli:period></xbrli:context>
<xbrli:context id="FourD"><xbrli:period><xbrli:startDate>2024-10-01</xbrli:startDate><xbrli:endDate>2024-12-31</xbrli:endDate></xbrli:period></xbrli:context>
<in-bse-fin:RevenueFromOperations contextRef="OneD" unitRef="INR" decimals="-7">${revenue}</in-bse-fin:RevenueFromOperations>
<in-bse-fin:RevenueFromOperations contextRef="FourD" unitRef="INR" decimals="-7">3966450000000.00</in-bse-fin:RevenueFromOperations>
<in-bse-fin:ProfitLossForPeriod contextRef="OneD" unitRef="INR" decimals="-7">${pat}</in-bse-fin:ProfitLossForPeriod>
<in-bse-fin:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" unitRef="INRPerShare" decimals="INF">${eps}</in-bse-fin:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
<in-bse-fin:DebtEquityRatio contextRef="OneD" unitRef="pure" decimals="INF">${debtEquity}</in-bse-fin:DebtEquityRatio>
</xbrli:xbrl>`;
}

describe("parseXbrlFinancialResult", () => {
  it("extracts P&L facts from the single-quarter (OneD) context, not the cumulative (FourD) one", () => {
    const parsed = parseXbrlFinancialResult(xbrlFixture());
    expect(parsed.revenue).toBe(1282600000000);
    expect(parsed.pat).toBe(87210000000);
    expect(parsed.eps).toBe(6.44);
  });

  it("keeps a real reported zero as 0, not null", () => {
    const parsed = parseXbrlFinancialResult(xbrlFixture({ debtEquity: "0.00" }));
    expect(parsed.debtEquity).toBe(0);
  });

  it("leaves fields the quarterly filing doesn't report as null, not 0", () => {
    const parsed = parseXbrlFinancialResult(xbrlFixture());
    expect(parsed.ebitda).toBeNull();
    expect(parsed.totalAssets).toBeNull();
    expect(parsed.cash).toBeNull();
    expect(parsed.operatingCashFlow).toBeNull();
  });

  it("returns null for a tag missing from the document entirely", () => {
    const xml = `<?xml version="1.0"?><xbrli:xbrl xmlns:in-bse-fin="http://www.bseindia.com/xbrl/fin/2020-03-31/in-bse-fin" xmlns:xbrli="http://www.xbrl.org/2003/instance"></xbrli:xbrl>`;
    const parsed = parseXbrlFinancialResult(xml);
    expect(parsed.revenue).toBeNull();
    expect(parsed.pat).toBeNull();
    expect(parsed.eps).toBeNull();
    expect(parsed.debtEquity).toBeNull();
  });
});

function row(overrides: Partial<NseFinancialResultRow> = {}): NseFinancialResultRow {
  return {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Limited",
    period: "Quarterly",
    relatingTo: "Third Quarter",
    financialYear: "01-Apr-2024 To 31-Mar-2025",
    fromDate: "01-Oct-2024",
    toDate: "31-Dec-2024",
    broadCastDate: "16-Jan-2025 20:20:21",
    filingDate: "16-Jan-2025 20:20",
    format: "New",
    consolidated: "Non-Consolidated",
    audited: "Un-Audited",
    seqNumber: "1189823",
    xbrl: "https://nsearchives.nseindia.com/corporate/xbrl/example.xml",
    ...overrides,
  };
}

describe("deriveNsePeriod", () => {
  it("derives a quarterly period from relatingTo + financialYear", () => {
    expect(deriveNsePeriod(row())).toEqual({
      period: "Q3 FY2025",
      periodType: "QUARTERLY",
      fiscalYear: 2025,
      fiscalQuarter: 3,
    });
  });

  it("derives an annual period", () => {
    expect(
      deriveNsePeriod(row({ period: "Annual", relatingTo: "Annual", financialYear: "01-Apr-2024 To 31-Mar-2025" }))
    ).toEqual({
      period: "FY2025",
      periodType: "ANNUAL",
      fiscalYear: 2025,
      fiscalQuarter: null,
    });
  });

  it("throws on an unrecognized relatingTo value instead of guessing a quarter", () => {
    expect(() => deriveNsePeriod(row({ relatingTo: "First Half" }))).toThrow(/unrecognized nse relatingto/i);
  });

  it("throws when financialYear can't be parsed", () => {
    expect(() => deriveNsePeriod(row({ financialYear: "-" }))).toThrow(/cannot derive fiscal year/i);
  });
});

describe("pickLatestResultWithXbrl", () => {
  it("picks the first New-format row with a real xbrl link", () => {
    const rows = [row({ format: "Old", xbrl: "-" }), row({ format: "New", xbrl: "https://example.com/a.xml" })];
    expect(pickLatestResultWithXbrl(rows)?.xbrl).toBe("https://example.com/a.xml");
  });

  it("returns null when nothing has a usable xbrl link", () => {
    const rows = [row({ format: "Old", xbrl: "-" })];
    expect(pickLatestResultWithXbrl(rows)).toBeNull();
  });
});

describe("mapStatementType", () => {
  it("maps NSE's Consolidated value", () => {
    expect(mapStatementType("Consolidated")).toBe("CONSOLIDATED");
  });

  it("maps NSE's Non-Consolidated value to STANDALONE", () => {
    expect(mapStatementType("Non-Consolidated")).toBe("STANDALONE");
  });

  it("throws on an unrecognized value instead of guessing", () => {
    expect(() => mapStatementType("Combined")).toThrow(/unrecognized nse consolidated value/i);
  });
});

describe("pickHistoricalResultsWithXbrl", () => {
  it("keeps both Standalone and Consolidated rows for the same period as separate entries", () => {
    const rows = [row({ consolidated: "Non-Consolidated" }), row({ consolidated: "Consolidated" })];
    const picked = pickHistoricalResultsWithXbrl(rows, 20);
    expect(picked).toHaveLength(2);
  });

  it("dedupes a repeated (period, statementType) combination, keeping the most-recent (first) occurrence", () => {
    const rows = [
      row({ consolidated: "Non-Consolidated", broadCastDate: "20-Jan-2025 10:00:00", xbrl: "https://example.com/revised.xml" }),
      row({ consolidated: "Non-Consolidated", broadCastDate: "16-Jan-2025 20:20:21", xbrl: "https://example.com/original.xml" }),
    ];
    const picked = pickHistoricalResultsWithXbrl(rows, 20);
    expect(picked).toHaveLength(1);
    expect(picked[0].xbrl).toBe("https://example.com/revised.xml");
  });

  it("excludes rows without a usable xbrl link", () => {
    const rows = [row({ xbrl: "-" })];
    expect(pickHistoricalResultsWithXbrl(rows, 20)).toHaveLength(0);
  });

  it("excludes Old-format rows (pre-2015 archive)", () => {
    const rows = [row({ format: "Old" })];
    expect(pickHistoricalResultsWithXbrl(rows, 20)).toHaveLength(0);
  });

  it("respects the maxPeriods cap", () => {
    const rows = [
      row({ relatingTo: "Third Quarter", financialYear: "01-Apr-2024 To 31-Mar-2025", consolidated: "Non-Consolidated" }),
      row({ relatingTo: "Second Quarter", financialYear: "01-Apr-2024 To 31-Mar-2025", consolidated: "Non-Consolidated" }),
      row({ relatingTo: "First Quarter", financialYear: "01-Apr-2024 To 31-Mar-2025", consolidated: "Non-Consolidated" }),
    ];
    expect(pickHistoricalResultsWithXbrl(rows, 2)).toHaveLength(2);
  });

  it("skips a row with an unrecognized consolidated value rather than crashing", () => {
    const rows = [row({ consolidated: "Combined" }), row({ consolidated: "Consolidated" })];
    expect(pickHistoricalResultsWithXbrl(rows, 20)).toHaveLength(1);
  });
});
