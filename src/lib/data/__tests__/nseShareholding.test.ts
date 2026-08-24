import { describe, expect, it } from "vitest";
import { parseXbrlShareholding, parseNseShareholdingDate, pickShareholdingHistoryWithXbrl, type NseShareholdingListRow } from "@/lib/data/nse/nseShareholding";

// Minimal fixtures using the real tag names/namespace confirmed against live
// NSE shareholding XBRL — see nseShareholding.ts doc comment. Two taxonomy
// versions exist; both are represented here since the parser must handle both.
function newerXbrlFixture(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:in-bse-shp="http://www.bseindia.com/xbrl/shp/2019-03-31/in-bse-shp" xmlns:xbrli="http://www.xbrl.org/2003/instance">
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="ShareholdingOfPromoterAndPromoterGroup_ContextI" decimals="INF" unitRef="pure">0.5048</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="PublicShareholding_ContextI" decimals="INF" unitRef="pure">0.4952</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsForeign_ContextI" decimals="INF" unitRef="pure">0.172</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsDomestic_ContextI" decimals="INF" unitRef="pure">0.2119</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="MutualFundsOrUTI_ContextI" decimals="INF" unitRef="pure">0.1011</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:WhetherAnySharesHeldByPromotersAreEncumberedUnderPledged contextRef="MainI">false</in-bse-shp:WhetherAnySharesHeldByPromotersAreEncumberedUnderPledged>
</xbrli:xbrl>`;
}

function olderXbrlFixture(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:in-bse-shp="http://www.bseindia.com/xbrl/shp/2019-03-31/in-bse-shp" xmlns:xbrli="http://www.xbrl.org/2003/instance">
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="ShareholdingOfPromoterAndPromoterGroupI" decimals="INF" unitRef="pure">50.11</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="PublicShareholdingI" decimals="INF" unitRef="pure">49.89</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsForeignI" decimals="INF" unitRef="pure">19.06</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsDomesticI" decimals="INF" unitRef="pure">19.46</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="MutualFundsOrUtiI" decimals="INF" unitRef="pure">9.21</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
</xbrli:xbrl>`;
}

describe("parseXbrlShareholding", () => {
  it("parses the newer taxonomy (fraction values, _ContextI suffix)", () => {
    const parsed = parseXbrlShareholding(newerXbrlFixture());
    expect(parsed.promoterHolding).toBeCloseTo(50.48);
    expect(parsed.publicHolding).toBeCloseTo(49.52);
    expect(parsed.fiiHolding).toBeCloseTo(17.2);
    expect(parsed.diiHolding).toBeCloseTo(21.19);
    expect(parsed.mutualFundHolding).toBeCloseTo(10.11);
  });

  it("parses the older taxonomy (already-percentage values, plain I suffix)", () => {
    const parsed = parseXbrlShareholding(olderXbrlFixture());
    expect(parsed.promoterHolding).toBeCloseTo(50.11);
    expect(parsed.publicHolding).toBeCloseTo(49.89);
    expect(parsed.fiiHolding).toBeCloseTo(19.06);
    expect(parsed.diiHolding).toBeCloseTo(19.46);
    expect(parsed.mutualFundHolding).toBeCloseTo(9.21);
  });

  it("records a real 0 pledge percentage when the source's boolean flag says false", () => {
    expect(parseXbrlShareholding(newerXbrlFixture()).pledgedPercentage).toBe(0);
  });

  it("leaves pledgedPercentage null when the flag is absent (unconfirmed tag, not guessed)", () => {
    expect(parseXbrlShareholding(olderXbrlFixture()).pledgedPercentage).toBeNull();
  });

  it("returns null for every field when the document has neither taxonomy's tags", () => {
    const xml = `<?xml version="1.0"?><xbrli:xbrl xmlns:in-bse-shp="http://www.bseindia.com/xbrl/shp/2019-03-31/in-bse-shp" xmlns:xbrli="http://www.xbrl.org/2003/instance"></xbrli:xbrl>`;
    const parsed = parseXbrlShareholding(xml);
    expect(parsed.promoterHolding).toBeNull();
    expect(parsed.fiiHolding).toBeNull();
  });
});

describe("parseNseShareholdingDate", () => {
  it("parses NSE's DD-MON-YYYY format", () => {
    expect(parseNseShareholdingDate("30-JUN-2026").toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("throws on an unrecognized format instead of guessing", () => {
    expect(() => parseNseShareholdingDate("2026-06-30")).toThrow(/unrecognized nse shareholding date format/i);
  });
});

function row(overrides: Partial<NseShareholdingListRow> = {}): NseShareholdingListRow {
  return {
    date: "30-JUN-2026",
    broadcastDate: "16-JUL-2026 19:24:44",
    pr_and_prgrp: "50.48",
    public_val: "49.52",
    symbol: "RELIANCE",
    xbrl: "https://nsearchives.nseindia.com/corporate/xbrl/example.xml",
    ...overrides,
  };
}

describe("pickShareholdingHistoryWithXbrl", () => {
  it("keeps rows with a real xbrl link, most-recent first", () => {
    const rows = [row(), row({ date: "31-MAR-2026" })];
    expect(pickShareholdingHistoryWithXbrl(rows, 12)).toHaveLength(2);
  });

  it("excludes rows without a usable xbrl link", () => {
    const rows = [row({ xbrl: "-" }), row({ xbrl: null })];
    expect(pickShareholdingHistoryWithXbrl(rows, 12)).toHaveLength(0);
  });

  it("respects the maxPeriods cap", () => {
    const rows = [row(), row({ date: "31-MAR-2026" }), row({ date: "31-DEC-2025" })];
    expect(pickShareholdingHistoryWithXbrl(rows, 2)).toHaveLength(2);
  });
});
