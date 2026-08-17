import { describe, expect, it } from "vitest";
import { parseFinancialsResponse, StoximApiError } from "@/lib/data/stoxim";

describe("parseFinancialsResponse", () => {
  it("parses the confirmed fields from the documented example response", () => {
    const raw = {
      status: "success",
      data: {
        isin: "INE009A01021",
        company_name: "HDFC Bank Limited",
        period: "Q3 FY2025",
        revenue: 89432000000,
        net_income: 16736000000,
        earnings_per_share: 22.15,
      },
    };
    const result = parseFinancialsResponse("INE009A01021", raw);
    expect(result.revenue).toBe(89432000000);
    expect(result.pat).toBe(16736000000); // net_income maps to pat
    expect(result.eps).toBe(22.15);
    expect(result.companyName).toBe("HDFC Bank Limited");
    expect(result.period).toBe("Q3 FY2025");
  });

  it("leaves unconfirmed/omitted fields as null, never 0", () => {
    const raw = { status: "success", data: { isin: "INE009A01021", revenue: 100 } };
    const result = parseFinancialsResponse("INE009A01021", raw);
    expect(result.ebitda).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.debtEquity).toBeNull();
    // explicitly must not be 0
    expect(result.ebitda).not.toBe(0);
  });

  it("throws on a non-success status instead of returning empty data", () => {
    expect(() => parseFinancialsResponse("X", { status: "error", message: "not found" })).toThrow(StoximApiError);
  });

  it("throws when the response has no data object", () => {
    expect(() => parseFinancialsResponse("X", { status: "success" })).toThrow(StoximApiError);
  });

  it("tries alternate candidate keys for unconfirmed fields (best-effort, documented as unverified)", () => {
    const raw = { status: "success", data: { isin: "X", debt_to_equity: 0.42 } };
    const result = parseFinancialsResponse("X", raw);
    expect(result.debtEquity).toBe(0.42);
  });

  it("does not coerce a real zero value into null (0 is meaningfully different from missing)", () => {
    const raw = { status: "success", data: { isin: "X", revenue: 0 } };
    const result = parseFinancialsResponse("X", raw);
    expect(result.revenue).toBe(0);
  });
});
