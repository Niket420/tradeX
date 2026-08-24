/** Real per-section ingestion status, derived from actual row timestamps/counts — never hardcoded. */
export interface SectionFreshness {
  source: string | null;
  lastUpdated: Date | null;
  periodsAvailable: number;
}

function latestTimestamp(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

function primarySource(sources: string[]): string | null {
  if (sources.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of sources) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].toUpperCase();
}

export function computeFreshness<T extends { source: string; updatedAt?: Date; createdAt?: Date }>(rows: T[]): SectionFreshness {
  return {
    source: primarySource(rows.map((r) => r.source)),
    lastUpdated: latestTimestamp(rows.map((r) => r.updatedAt ?? r.createdAt).filter((d): d is Date => d !== undefined)),
    periodsAvailable: rows.length,
  };
}
