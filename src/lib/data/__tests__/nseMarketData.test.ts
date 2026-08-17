import { describe, expect, it } from "vitest";
import { parseNseTimestamp, parseNsePriceRow, formatNseDate, type NseHistoricalPriceRow } from "@/lib/data/nse/nseMarketData";

describe("parseNseTimestamp", () => {
  it("parses NSE's DD-Mon-YYYY format", () => {
    expect(parseNseTimestamp("14-Aug-2026").toISOString()).toBe("2026-08-14T00:00:00.000Z");
  });

  it("throws on an unrecognized format instead of guessing", () => {
    expect(() => parseNseTimestamp("2026-08-14")).toThrow(/unrecognized nse date format/i);
  });

  it("throws on an unrecognized month abbreviation", () => {
    expect(() => parseNseTimestamp("14-Xyz-2026")).toThrow(/unrecognized month abbreviation/i);
  });
});

describe("formatNseDate", () => {
  it("formats a Date as DD-MM-YYYY", () => {
    expect(formatNseDate(new Date(Date.UTC(2026, 7, 14)))).toBe("14-08-2026");
  });
});

function row(overrides: Partial<NseHistoricalPriceRow> = {}): NseHistoricalPriceRow {
  return {
    CH_SYMBOL: "RELIANCE",
    CH_SERIES: "EQ",
    mTIMESTAMP: "14-Aug-2026",
    CH_OPENING_PRICE: 1317,
    CH_TRADE_HIGH_PRICE: 1317.5,
    CH_TRADE_LOW_PRICE: 1301.5,
    CH_CLOSING_PRICE: 1310,
    CH_LAST_TRADED_PRICE: 1310,
    VWAP: 1308.27,
    CH_TOT_TRADED_QTY: 10497358,
    CH_TOT_TRADED_VAL: 13733404720.5,
    ...overrides,
  };
}

describe("parseNsePriceRow", () => {
  it("maps NSE's raw OHLCV fields to PriceHistory-shaped fields", () => {
    const parsed = parseNsePriceRow(row());
    expect(parsed.date.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(parsed.open).toBe(1317);
    expect(parsed.high).toBe(1317.5);
    expect(parsed.low).toBe(1301.5);
    expect(parsed.close).toBe(1310);
    expect(parsed.volume).toBe(10497358);
    expect(parsed.tradedValue).toBe(13733404720.5);
  });

  it("leaves adjustedClose null — NSE's historical archive doesn't report it", () => {
    expect(parseNsePriceRow(row()).adjustedClose).toBeNull();
  });

  it("keeps tradedValue null (not 0) when the source omits it", () => {
    expect(parseNsePriceRow(row({ CH_TOT_TRADED_VAL: null })).tradedValue).toBeNull();
  });
});
