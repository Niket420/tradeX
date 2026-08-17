import { describe, expect, it } from "vitest";
import { parseGdeltArticle, type GdeltArticle } from "@/lib/data/gdelt";

function article(overrides: Partial<GdeltArticle> = {}): GdeltArticle {
  return {
    url: "https://example.com/article",
    title: "Reliance Industries announces new venture",
    seendate: "20260814T173000Z",
    domain: "example.com",
    language: "English",
    sourcecountry: "India",
    ...overrides,
  };
}

describe("parseGdeltArticle", () => {
  it("maps GDELT's documented fields onto NewsArticle-shaped fields", () => {
    const parsed = parseGdeltArticle(article());
    expect(parsed.title).toBe("Reliance Industries announces new venture");
    expect(parsed.url).toBe("https://example.com/article");
    expect(parsed.sourceDomain).toBe("example.com");
    expect(parsed.language).toBe("English");
    expect(parsed.sourceCountry).toBe("India");
    expect(parsed.publishedAt?.toISOString()).toBe("2026-08-14T17:30:00.000Z");
  });

  it("returns null publishedAt for an unparseable seendate instead of guessing", () => {
    expect(parseGdeltArticle(article({ seendate: "not-a-date" })).publishedAt).toBeNull();
  });

  it("never stores a full article body — only metadata fields exist on the parsed shape", () => {
    const parsed = parseGdeltArticle(article());
    expect(Object.keys(parsed)).toEqual(["title", "url", "sourceDomain", "publishedAt", "language", "sourceCountry"]);
  });
});
