import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Debug-only raw API response storage: data/raw/{provider}/{isin}/{timestamp}.json.
 * Never committed (see .gitignore) — for inspecting exactly what an external
 * API returned when a value looks wrong. Not a durable store; safe to delete
 * the whole data/raw/ directory at any time.
 */
export function saveRawResponse(provider: string, isin: string, payload: unknown): string {
  const dir = join(process.cwd(), "data", "raw", provider, isin);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${Date.now()}.json`);
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return filePath;
}

/** Same convention as saveRawResponse, for non-JSON payloads (e.g. XBRL XML). */
export function saveRawText(provider: string, isin: string, text: string, extension: string): string {
  const dir = join(process.cwd(), "data", "raw", provider, isin);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${Date.now()}.${extension}`);
  writeFileSync(filePath, text, "utf8");
  return filePath;
}
