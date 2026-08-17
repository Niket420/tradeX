import { describe, expect, it } from "vitest";
import { deriveFinancialPeriod } from "@/lib/data/period";

describe("deriveFinancialPeriod", () => {
  it("parses a quarterly period", () => {
    expect(deriveFinancialPeriod("Q3 FY2025")).toEqual({
      period: "Q3 FY2025",
      periodType: "QUARTERLY",
      fiscalYear: 2025,
      fiscalQuarter: 3,
    });
  });

  it("parses an annual period", () => {
    expect(deriveFinancialPeriod("FY2025")).toEqual({
      period: "FY2025",
      periodType: "ANNUAL",
      fiscalYear: 2025,
      fiscalQuarter: null,
    });
  });

  it("throws rather than guessing on an unrecognized format", () => {
    expect(() => deriveFinancialPeriod("2025-Q3")).toThrow(/unrecognized period format/i);
  });

  it("throws on a null period instead of fabricating a fiscal year", () => {
    expect(() => deriveFinancialPeriod(null)).toThrow(/did not include a period/i);
  });
});
