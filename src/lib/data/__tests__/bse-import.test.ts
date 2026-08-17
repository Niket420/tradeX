import { describe, expect, it } from "vitest";
import { parseBseRows, importBseCompanies } from "@/lib/data/bse-import";
import { importNseCompanies, type CompanyUpsertClient } from "@/lib/data/nse-import";

const HEADER = "Security Code,Issuer Name,Security Id,Security Name,Status,Group,Face Value,ISIN No,Instrument";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("parseBseRows", () => {
  it("parses valid rows", () => {
    const result = parseBseRows(csv("500002,ABB India Limited,ABB,ABB India Ltd,Active,A ,2.00,INE117A01022,Equity,,,,,"));
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({ isin: "INE117A01022", companyName: "ABB India Limited", bseCode: "500002", bseSymbol: "ABB" });
  });

  it("keeps rows regardless of Status/Instrument, classifying rather than dropping them", () => {
    const result = parseBseRows(csv("999999,Some Mutual Fund-Permitted,MFPERM,Some MF,Active,A ,10.00,INE999Z01011,Equity,,,,,"));
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].securityType).toBe("ETF");
  });

  it("counts invalid ISIN rows", () => {
    const result = parseBseRows(csv("1,No ISIN Co,X,X,Active,A ,1.00,BADISIN,Equity"));
    expect(result.invalidIsin).toBe(1);
    expect(result.valid).toHaveLength(0);
  });

  it("throws when expected columns are missing", () => {
    expect(() => parseBseRows("A,B,C\n1,2,3")).toThrow(/missing expected column/i);
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

  get(isin: string) {
    return this.rows.get(isin);
  }
}

describe("importBseCompanies", () => {
  it("creates a new company when the ISIN is BSE-only", async () => {
    const client = new FakeCompanyClient();
    const summary = await importBseCompanies(csv("500002,ABB India Limited,ABB,ABB India Ltd,Active,A ,2.00,INE117A01022,Equity"), client);
    expect(summary.newCompanies).toBe(1);
    expect(client.size).toBe(1);
  });

  it("attaches BSE identifiers to an existing NSE-sourced company instead of duplicating it", async () => {
    const client = new FakeCompanyClient();
    // Same ISIN arrives via NSE first...
    await importNseCompanies(
      "SYMBOL,NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE\nABB,ABB India Limited,EQ,01-JAN-2000,1,1,INE117A01022,1",
      client
    );
    expect(client.size).toBe(1);

    // ...then the same company also appears in the BSE file.
    const summary = await importBseCompanies(csv("500002,ABB India Limited,ABB,ABB India Ltd,Active,A ,2.00,INE117A01022,Equity"), client);

    expect(summary.newCompanies).toBe(0);
    expect(summary.updatedCompanies).toBe(1);
    expect(client.size).toBe(1); // still one company, not two
    expect(client.get("INE117A01022")).toMatchObject({ nseSymbol: "ABB", bseCode: "500002" });
  });
});
