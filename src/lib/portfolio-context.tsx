"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { paperPortfolio as seedPortfolio, getCompany } from "@/lib/mock-data";
import { PaperHolding } from "@/lib/types";

const STORAGE_KEY = "tradex.paperPortfolio.holdings.v1";

type RawHolding = Omit<PaperHolding, "currentPrice">;

// Computed once at module load — useSyncExternalStore requires getServerSnapshot to return a
// referentially stable value, so this must never be recomputed per call.
const SEED_RAW_HOLDINGS: RawHolding[] = seedPortfolio.holdings.map((h) => ({
  symbol: h.symbol,
  companyName: h.companyName,
  entryDate: h.entryDate,
  entryPrice: h.entryPrice,
  quantity: h.quantity,
  signal: h.signal,
  score: h.score,
  reason: h.reason,
}));

// A tiny external store (outside React state) so we can use useSyncExternalStore: it serves
// getServerSnapshot() during SSR/hydration and getSnapshot() afterward, which is React's
// documented way to read a browser-only source (localStorage) without a hydration mismatch —
// no setState-in-effect needed.
let cached: RawHolding[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): RawHolding[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_RAW_HOLDINGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_RAW_HOLDINGS;
  } catch {
    return SEED_RAW_HOLDINGS;
  }
}

function getSnapshot(): RawHolding[] {
  if (cached === null) cached = readStorage();
  return cached;
}

function getServerSnapshot(): RawHolding[] {
  return SEED_RAW_HOLDINGS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeStorage(next: RawHolding[]) {
  cached = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

interface PortfolioContextValue {
  holdings: PaperHolding[];
  addHolding: (holding: RawHolding) => void;
  removeHolding: (symbol: string) => void;
  isHeld: (symbol: string) => boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PaperPortfolioProvider({ children }: { children: ReactNode }) {
  const rawHoldings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const holdings = useMemo<PaperHolding[]>(
    () =>
      rawHoldings.map((h) => ({
        ...h,
        currentPrice: getCompany(h.symbol)?.price ?? h.entryPrice,
      })),
    [rawHoldings]
  );

  const value = useMemo<PortfolioContextValue>(
    () => ({
      holdings,
      addHolding: (holding) => {
        const current = getSnapshot();
        if (current.some((h) => h.symbol === holding.symbol)) return;
        writeStorage([...current, holding]);
      },
      removeHolding: (symbol) => writeStorage(getSnapshot().filter((h) => h.symbol !== symbol)),
      isHeld: (symbol) => rawHoldings.some((h) => h.symbol === symbol),
    }),
    [holdings, rawHoldings]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePaperPortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePaperPortfolio must be used within PaperPortfolioProvider");
  return ctx;
}
