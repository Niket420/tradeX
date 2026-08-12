"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { marketStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <LineChart className="h-4 w-4" />
        </div>
        <span className="font-mono text-sm font-semibold tracking-tight text-sidebar-foreground">
          TRADE<span className="text-primary">X</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "opacity-70")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">NIFTY 50</span>
          <span className="font-mono tabular-nums text-emerald-400">
            {marketStatus.nifty.value.toLocaleString("en-IN")} ({marketStatus.nifty.change > 0 ? "+" : ""}
            {marketStatus.nifty.change}%)
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">SENSEX</span>
          <span className="font-mono tabular-nums text-emerald-400">
            {marketStatus.sensex.value.toLocaleString("en-IN")} ({marketStatus.sensex.change > 0 ? "+" : ""}
            {marketStatus.sensex.change}%)
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", marketStatus.isOpen ? "bg-emerald-400" : "bg-rose-400")} />
          <span className="text-muted-foreground">Market {marketStatus.isOpen ? "Open" : "Closed"}</span>
        </div>
      </div>
    </aside>
  );
}
