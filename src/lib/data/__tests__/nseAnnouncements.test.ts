import { describe, expect, it } from "vitest";
import { parseNseDateTime, parseNseAnnouncement, type NseAnnouncementRow } from "@/lib/data/nse/nseAnnouncements";

describe("parseNseDateTime", () => {
  it("parses NSE's DD-Mon-YYYY HH:MM:SS format", () => {
    expect(parseNseDateTime("14-Aug-2026 17:48:28").toISOString()).toBe("2026-08-14T17:48:28.000Z");
  });

  it("throws on an unrecognized format instead of guessing", () => {
    expect(() => parseNseDateTime("2026-08-14")).toThrow(/unrecognized nse datetime format/i);
  });
});

function row(overrides: Partial<NseAnnouncementRow> = {}): NseAnnouncementRow {
  return {
    an_dt: "14-Aug-2026 17:48:27",
    exchdisstime: "14-Aug-2026 17:48:28",
    desc: "Updates",
    attchmntText: "Some detail text.",
    attchmntFile: "https://nsearchives.nseindia.com/corporate/example.pdf",
    seq_id: "106744908",
    sm_isin: "INE002A01018",
    sm_name: "Reliance Industries Limited",
    symbol: "RELIANCE",
    ...overrides,
  };
}

describe("parseNseAnnouncement", () => {
  it("maps NSE's raw fields onto Announcement-shaped fields", () => {
    const parsed = parseNseAnnouncement(row());
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Updates");
    expect(parsed!.announcementType).toBe("Updates");
    expect(parsed!.description).toBe("Some detail text.");
    expect(parsed!.sourceUrl).toBe("https://nsearchives.nseindia.com/corporate/example.pdf");
    expect(parsed!.externalId).toBe("106744908");
    expect(parsed!.announcementDate.toISOString()).toBe("2026-08-14T17:48:28.000Z");
  });

  it("prefers exchdisstime over an_dt for the announcement date", () => {
    const parsed = parseNseAnnouncement(row({ an_dt: "13-Aug-2026 10:00:00", exchdisstime: "14-Aug-2026 17:48:28" }));
    expect(parsed!.announcementDate.toISOString()).toBe("2026-08-14T17:48:28.000Z");
  });

  it("falls back to an_dt when exchdisstime is missing", () => {
    const parsed = parseNseAnnouncement(row({ exchdisstime: null, an_dt: "13-Aug-2026 10:00:00" }));
    expect(parsed!.announcementDate.toISOString()).toBe("2026-08-13T10:00:00.000Z");
  });

  it("returns null (skips) when there's no attachment URL, rather than fabricating one", () => {
    expect(parseNseAnnouncement(row({ attchmntFile: null }))).toBeNull();
  });
});
