import { describe, expect, it } from "vitest";
import { isValidIsin, normalizeIsin } from "@/lib/data/isin";

describe("isValidIsin", () => {
  it("accepts a well-formed Indian ISIN", () => {
    expect(isValidIsin("INE009A01021")).toBe(true);
  });

  it("accepts lowercase and trims whitespace", () => {
    expect(isValidIsin(" ine009a01021 ")).toBe(true);
  });

  it("rejects non-Indian country codes", () => {
    expect(isValidIsin("US0378331005")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidIsin("INE009A0102")).toBe(false);
    expect(isValidIsin("INE009A010211")).toBe(false);
  });

  it("rejects missing/empty/null values", () => {
    expect(isValidIsin(undefined)).toBe(false);
    expect(isValidIsin(null)).toBe(false);
    expect(isValidIsin("")).toBe(false);
  });
});

describe("normalizeIsin", () => {
  it("uppercases and trims", () => {
    expect(normalizeIsin(" ine009a01021 ")).toBe("INE009A01021");
  });
});
