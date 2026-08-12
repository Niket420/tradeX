export function formatINR(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatCr(value: number): string {
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)}L Cr`;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

export function formatPrice(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function changeColorClass(value: number): string {
  if (value > 0.05) return "text-emerald-400";
  if (value < -0.05) return "text-rose-400";
  return "text-muted-foreground";
}

export function scoreColorClass(value: number): string {
  if (value >= 75) return "text-emerald-400";
  if (value >= 55) return "text-sky-400";
  if (value >= 35) return "text-amber-400";
  return "text-rose-400";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function timeAgo(iso: string): string {
  const diffMs = new Date("2026-08-12T15:30:00Z").getTime() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
