import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPct, changeColorClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PriceReturnFeatures } from "@/lib/features";

export interface RealCompanyHeaderProps {
  companyName: string;
  symbol: string | null;
  isin: string;
  sector: string | null;
  industry: string | null;
  returns: PriceReturnFeatures | null;
}

/** Real-data equivalent of CompanyHeader — no score badge (no scoring engine exists yet), real price + returns only. */
export function RealCompanyHeader({ companyName, symbol, isin, sector, industry, returns }: RealCompanyHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{companyName}</h1>
            {symbol && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{symbol}</span>}
            <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400">Real data</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{isin}</span>
            {sector && (
              <>
                <span>·</span>
                <span>{sector}</span>
              </>
            )}
            {industry && (
              <>
                <span>·</span>
                <span>{industry}</span>
              </>
            )}
          </div>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Star className="h-4 w-4" />
        </Button>
      </div>

      {returns ? (
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <div className="font-mono text-3xl font-semibold tabular-nums">₹{returns.latestClose?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}</div>
            <div className="text-xs text-muted-foreground">as of {returns.asOfDate}</div>
          </div>
          <div className="flex gap-5 text-sm">
            <ChangeStat label="1D" value={returns.return1D} />
            <ChangeStat label="1W" value={returns.return1W} />
            <ChangeStat label="1M" value={returns.return1M} />
            <ChangeStat label="1Y" value={returns.return1Y} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No price data available yet.</p>
      )}
    </div>
  );
}

function ChangeStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", value === null ? "text-muted-foreground" : changeColorClass(value))}>{value === null ? "—" : formatPct(value)}</span>
    </div>
  );
}
