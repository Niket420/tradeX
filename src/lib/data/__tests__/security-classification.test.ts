import { describe, expect, it } from "vitest";
import { classifySecurityType } from "@/lib/data/security-classification";

describe("classifySecurityType", () => {
  it("classifies ordinary company names as common equity", () => {
    expect(classifySecurityType("Reliance Industries Limited")).toBe("COMMON_EQUITY");
    expect(classifySecurityType("Tata Consultancy Services Limited")).toBe("COMMON_EQUITY");
  });

  it("classifies mutual-fund permitted-to-trade entries as ETF", () => {
    expect(classifySecurityType("Reliance Mutual Fund-Permitted")).toBe("ETF");
    expect(classifySecurityType("Nippon India ETF Nifty 50")).toBe("ETF");
  });

  it("classifies preference shares as PREFERENCE", () => {
    expect(classifySecurityType("XYZ Ltd 8% Cum. Red. Pref Shares")).toBe("PREFERENCE");
  });

  it("classifies REITs/InvITs/business trusts as OTHER", () => {
    expect(classifySecurityType("Embassy Office Parks REIT")).toBe("OTHER");
    expect(classifySecurityType("IRB InvIT Fund")).toBe("OTHER");
  });
});
