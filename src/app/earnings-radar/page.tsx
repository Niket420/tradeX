import { EarningsRow } from "@/components/earnings-row";
import { upcomingResults, resultsToday, resultsThisWeek } from "@/lib/mock-data";

export default function EarningsRadarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Earnings Radar</h1>
        <p className="text-sm text-muted-foreground">
          Tracking upcoming and recently released quarterly results. Good result ≠ good stock signal — what matters is actual vs expectation.
        </p>
      </div>

      <Section title={`Results Released Today (${resultsToday.length})`} companies={resultsToday} />
      <Section title={`Results Released This Week (${resultsThisWeek.length})`} companies={resultsThisWeek} />
      <Section title={`Upcoming Results (${upcomingResults.length})`} companies={upcomingResults} />
    </div>
  );
}

function Section({ title, companies }: { title: string; companies: typeof upcomingResults }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {companies.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {companies.map((c) => (
            <EarningsRow key={c.symbol} company={c} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No companies in this window.</p>
      )}
    </section>
  );
}
