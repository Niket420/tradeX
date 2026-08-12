import { SectorCard } from "@/components/sector-card";
import { sectorSummaries, emergingSectors } from "@/lib/mock-data";

export default function SectorIntelligencePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Sector Intelligence</h1>
        <p className="text-sm text-muted-foreground">Aggregate fundamentals and change signals across every tracked sector.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Emerging Sectors</h2>
        <p className="text-xs text-muted-foreground">Sectors with the most companies accelerating and expanding margins.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {emergingSectors.map((s) => (
            <SectorCard key={s.sector} sector={s} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">All Sectors</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sectorSummaries.map((s) => (
            <SectorCard key={s.sector} sector={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
