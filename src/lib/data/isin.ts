/**
 * ISIN validation. Format: 2-letter country code + 9 alphanumeric characters
 * (NSIN) + 1 numeric check digit = 12 characters total. We additionally
 * require the "IN" country code since this pipeline is scoped to Indian
 * listed companies.
 */
const ISIN_PATTERN = /^IN[A-Z0-9]{9}[0-9]$/;

export function isValidIsin(value: string | null | undefined): value is string {
  if (!value) return false;
  return ISIN_PATTERN.test(value.trim().toUpperCase());
}

export function normalizeIsin(value: string): string {
  return value.trim().toUpperCase();
}
