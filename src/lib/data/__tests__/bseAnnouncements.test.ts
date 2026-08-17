import { describe, expect, it } from "vitest";
import { parseBseAnnouncement, type BseAnnouncementRow } from "@/lib/data/bse/bseAnnouncements";

function row(overrides: Partial<BseAnnouncementRow> = {}): BseAnnouncementRow {
  return {
    NEWSID: "e48e0687-d683-47d5-bdd9-698a1db9af01",
    SCRIP_CD: 500325,
    NEWSSUB: "Media Release - Reliance and Rolls-Royce",
    DT_TM: "2026-08-14T17:45:54.693",
    NEWS_DT: "2026-08-14T17:45:54.693",
    ATTACHMENTNAME: "c97374ee-7904-4c1e-83ee-6cac42c0eaff.pdf",
    MORE: "Full detail text.",
    HEADLINE: "Truncated headline.",
    CATEGORYNAME: "Company Update",
    ...overrides,
  };
}

describe("parseBseAnnouncement", () => {
  it("maps BSE's raw fields onto Announcement-shaped fields", () => {
    const parsed = parseBseAnnouncement(row());
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Media Release - Reliance and Rolls-Royce");
    expect(parsed!.description).toBe("Full detail text.");
    expect(parsed!.announcementType).toBe("Company Update");
    expect(parsed!.externalId).toBe("e48e0687-d683-47d5-bdd9-698a1db9af01");
    expect(parsed!.sourceUrl).toBe("https://www.bseindia.com/xml-data/corpfiling/AttachHis/c97374ee-7904-4c1e-83ee-6cac42c0eaff.pdf");
  });

  it("falls back to HEADLINE when MORE is absent", () => {
    const parsed = parseBseAnnouncement(row({ MORE: null }));
    expect(parsed!.description).toBe("Truncated headline.");
  });

  it("returns null (skip) when there's no attachment, rather than fabricating a URL", () => {
    expect(parseBseAnnouncement(row({ ATTACHMENTNAME: null }))).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(parseBseAnnouncement(row({ DT_TM: "not-a-date", NEWS_DT: "also-not-a-date" }))).toBeNull();
  });
});
