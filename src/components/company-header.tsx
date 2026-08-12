import { Star } from "lucide-react";
import { Company } from "@/lib/types";
import { formatCr, formatPct, formatPrice, changeColorClass } from "@/lib/format";
import { ScoreBadge } from "@/components/score-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CompanyHeader({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{company.symbol}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{company.sector}</span>
            <span>·</span>
            <span>{company.industry}</span>
            <span>·</span>
            <span>Mkt Cap {formatCr(company.marketCapCr)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={company.scores.multibagger} label="Multibagger Score" size="lg" />
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <div className="font-mono text-3xl font-semibold tabular-nums">{formatPrice(company.price)}</div>
          <div className={cn("font-mono text-sm tabular-nums", changeColorClass(company.change1d))}>{formatPct(company.change1d)} today</div>
        </div>
        <div className="flex gap-5 text-sm">
          <ChangeStat label="1D" value={company.change1d} />
          <ChangeStat label="1W" value={company.change1w} />
          <ChangeStat label="1M" value={company.change1m} />
          <ChangeStat label="1Y" value={company.change1y} />
        </div>
      </div>
    </div>
  );
}

function ChangeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", changeColorClass(value))}>{formatPct(value)}</span>
    </div>
  );
}
