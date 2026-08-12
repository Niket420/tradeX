import Link from "next/link";
import { Alert } from "@/lib/types";
import { SignalBadge } from "@/components/signal-badge";
import { timeAgo } from "@/lib/format";

export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <Link
      href={`/company/${alert.symbol}`}
      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/40"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{alert.symbol}</span>
          <SignalBadge type={alert.type} label={alert.type.replace(/_/g, " ")} severity={alert.severity} />
        </div>
        <p className="text-sm text-foreground/90">{alert.message}</p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{timeAgo(alert.timestamp)}</span>
    </Link>
  );
}
