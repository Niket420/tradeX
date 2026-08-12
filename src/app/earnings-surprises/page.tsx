import { EarningsRow } from "@/components/earnings-row";
import { earningsSurprises } from "@/lib/mock-data";

export default function EarningsSurprisesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Earnings Surprises</h1>
        <p className="text-sm text-muted-foreground">
          Companies where actual results materially beat (or missed) street estimates — ranked by profit surprise, with prior price run-up shown so you
          can judge whether the good news is already priced in.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {earningsSurprises.map((c) => (
          <EarningsRow key={c.symbol} company={c} showPriorRunUp />
        ))}
      </div>
    </div>
  );
}
