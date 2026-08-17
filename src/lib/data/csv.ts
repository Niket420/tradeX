/**
 * Minimal CSV parsing for the NSE/BSE security-master files. These files are
 * plain comma-separated with no quoted/escaped fields (verified against the
 * actual downloads) so a dependency-free split is sufficient — pulling in a
 * full CSV parser for this would be the "unnecessary dependency" the phase
 * brief explicitly warns against.
 *
 * Rows are exposed as header-name -> value maps rather than positional
 * tuples, so importers look up columns by name instead of assuming index —
 * if a source changes its column order, this fails loudly instead of
 * silently misreading data.
 */
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}
