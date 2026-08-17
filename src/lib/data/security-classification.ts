/**
 * Classifies a raw security name into a coarse SecurityType. NSE/BSE security
 * lists contain more than ordinary operating companies — ETFs, mutual-fund
 * "permitted to trade" units, preference shares — mixed in with common equity.
 *
 * This is a name-based heuristic, not authoritative security-master data.
 * It exists so questionable rows can be *kept and labeled* rather than
 * silently dropped or silently treated as normal companies.
 */
export type SecurityType = "COMMON_EQUITY" | "ETF" | "PREFERENCE" | "OTHER";

const ETF_PATTERN = /\b(mutual fund|etf|index fund|exchange traded fund)\b/i;
const PREFERENCE_PATTERN = /\b(pref(erence)?\s*shares?|(\d+(\.\d+)?%\s*)?cum\.?\s*red\.?\s*pref|non[\s-]?convertible)\b/i;
const TRUST_PATTERN = /\b(invit|reit|business trust)\b/i;

export function classifySecurityType(name: string): SecurityType {
  if (ETF_PATTERN.test(name)) return "ETF";
  if (PREFERENCE_PATTERN.test(name)) return "PREFERENCE";
  if (TRUST_PATTERN.test(name)) return "OTHER";
  return "COMMON_EQUITY";
}
