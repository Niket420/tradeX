import { describe, expect, it } from "vitest";
import { parseBsePricePoint, type BseGraphPoint } from "@/lib/data/bse/bseMarketData";

function point(overrides: Partial<BseGraphPoint> = {}): BseGraphPoint {
  return {
    dttm: "Fri Aug 14 2026 00:00:00",
    vale1: "1308.00",
    vole: "345809",
    ...overrides,
  };
}

describe("parseBsePricePoint", () => {
  it("maps BSE's raw graph point to a close+volume-only row", () => {
    const parsed = parseBsePricePoint(point());
    expect(parsed).not.toBeNull();
    expect(parsed!.close).toBe(1308);
    expect(parsed!.volume).toBe(345809);
    expect(parsed!.date.toISOString().slice(0, 10)).toBe("2026-08-14");
  });

  it("returns null for an unparseable date instead of guessing", () => {
    expect(parseBsePricePoint(point({ dttm: "not-a-date" }))).toBeNull();
  });

  it("returns null for a non-numeric price", () => {
    expect(parseBsePricePoint(point({ vale1: "N/A" }))).toBeNull();
  });

  it("defaults volume to 0 (not null) when unparseable, since volume is a required column", () => {
    const parsed = parseBsePricePoint(point({ vole: "N/A" }));
    expect(parsed!.volume).toBe(0);
  });
});
