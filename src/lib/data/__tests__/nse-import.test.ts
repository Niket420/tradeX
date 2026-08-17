import { describe, expect, it } from "vitest";
import { parseNseRows, importNseCompanies, type CompanyUpsertClient } from "@/lib/data/nse-import";

const HEADER = "SYMBOL,NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("parseNseRows", () => {
  it("parses valid rows", () => {
    const result = parseNseRows(
      csv(
        "20MICRONS,20 Microns Limited,EQ,06-OCT-2008,5,1,INE144J01027,5",
        "TCS,Tata Consultancy Services Limited,EQ,25-AUG-2004,1,1,INE467B01029,1"
      )
    );
    expect(result.totalRows).toBe(2);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toMatchObject({ isin: "INE144J01027", companyName: "20 Microns Limited", nseSymbol: "20MICRONS" });
    expect(result.skipped).toBe(0);
    expect(result.invalidIsin).toBe(0);
    expect(result.duplicateIsin).toBe(0);
  });

  it("counts rows with an invalid/malformed ISIN and excludes them from valid", () => {
    const result = parseNseRows(csv("ABC,ABC Ltd,EQ,01-JAN-2000,1,1,NOTANISIN,1"));
    expect(result.valid).toHaveLength(0);
    expect(result.invalidIsin).toBe(1);
  });

  it("counts rows with a missing ISIN", () => {
    const result = parseNseRows(csv("ABC,ABC Ltd,EQ,01-JAN-2000,1,1,,1"));
    expect(result.valid).toHaveLength(0);
    expect(result.invalidIsin).toBe(1);
  });

  it("skips rows missing a required name/symbol", () => {
    const result = parseNseRows(csv(",,EQ,01-JAN-2000,1,1,INE144J01027,5"));
    expect(result.valid).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("counts duplicate ISINs within the same file and keeps only the first", () => {
    const result = parseNseRows(
      csv("ABC,ABC Ltd,EQ,01-JAN-2000,1,1,INE144J01027,5", "ABCDUP,ABC Ltd Duplicate,EQ,01-JAN-2000,1,1,INE144J01027,5")
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].nseSymbol).toBe("ABC");
    expect(result.duplicateIsin).toBe(1);
  });

  it("throws when expected columns are missing (does not assume column layout)", () => {
    expect(() => parseNseRows("A,B,C\n1,2,3")).toThrow(/missing expected column/i);
  });

  it("never silently zeroes missing numeric-adjacent fields", () => {
    // Never assign 0/empty-string as a stand-in for missing data in normalized output.
    const result = parseNseRows(csv("ABC,ABC Ltd,,,,,INE144J01027,"));
    expect(result.valid[0].status).toBeNull();
  });
});

class FakeCompanyClient implements CompanyUpsertClient {
  private rows = new Map<string, { id: string; [key: string]: unknown }>();
  private nextId = 1;

  company = {
    findUnique: async ({ where }: { where: { isin: string } }) => this.rows.get(where.isin) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `id-${this.nextId++}`, ...data };
      this.rows.set(data.isin as string, row);
      return row;
    },
    update: async ({ where, data }: { where: { isin: string }; data: Record<string, unknown> }) => {
      const existing = this.rows.get(where.isin);
      if (!existing) throw new Error(`No row for isin ${where.isin}`);
      const row = { ...existing, ...data };
      this.rows.set(where.isin, row);
      return row;
    },
  };

  get size() {
    return this.rows.size;
  }
}

describe("importNseCompanies", () => {
  it("creates new companies and reports counts", async () => {
    const client = new FakeCompanyClient();
    const summary = await importNseCompanies(
      csv("20MICRONS,20 Microns Limited,EQ,06-OCT-2008,5,1,INE144J01027,5"),
      client
    );
    expect(summary.newCompanies).toBe(1);
    expect(summary.updatedCompanies).toBe(0);
    expect(client.size).toBe(1);
  });

  it("updates an existing company instead of duplicating it", async () => {
    const client = new FakeCompanyClient();
    await importNseCompanies(csv("20MICRONS,20 Microns Limited,EQ,06-OCT-2008,5,1,INE144J01027,5"), client);
    const summary = await importNseCompanies(csv("20MICRONS,20 Microns Ltd (Renamed),EQ,06-OCT-2008,5,1,INE144J01027,5"), client);

    expect(summary.newCompanies).toBe(0);
    expect(summary.updatedCompanies).toBe(1);
    expect(client.size).toBe(1);
  });
});
