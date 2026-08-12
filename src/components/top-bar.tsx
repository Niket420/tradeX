"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AIResearchPanel } from "@/components/ai-research-panel";
import { companies, alerts } from "@/lib/mock-data";
import { ScoreBadge } from "@/components/score-badge";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const results = (
    q
      ? companies.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q))
      : companies
  ).slice(0, 50);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const unreadHighAlerts = alerts.filter((a) => a.severity === "high").length;

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted/70"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search companies, sectors, symbols...</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <AIResearchPanel />
        <Button variant="outline" size="icon" className="relative h-9 w-9" onClick={() => router.push("/alerts")}>
          <Bell className="h-4 w-4" />
          {unreadHighAlerts > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white">
              {unreadHighAlerts}
            </span>
          ) : null}
        </Button>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
        shouldFilter={false}
      >
        <CommandInput placeholder="Jump to a company..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Companies">
            {results.map((c) => (
              <CommandItem
                key={c.symbol}
                value={c.symbol}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/company/${c.symbol}`);
                }}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{c.symbol}</span>
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">· {c.sector}</span>
                </span>
                <ScoreBadge score={c.scores.multibagger} />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
