// One-time build script: merges company_info/BSE.csv + NSE.csv into a deterministic
// CompanySeed[] TypeScript file consumed by src/lib/mock/generate-company.ts.
//
// Run with: node scripts/build-universe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SECTORS = [
  "IT",
  "Banks",
  "Financial Services",
  "Pharma",
  "Healthcare",
  "Auto",
  "Auto Components",
  "Capital Goods",
  "Defence",
  "Railways",
  "Renewables",
  "Power",
  "Chemicals",
  "Specialty Chemicals",
  "Consumer",
  "FMCG",
  "Real Estate",
  "Telecom",
  "Infrastructure",
  "Metals",
  "Mining",
  "Textiles",
];

const SECTOR_INDUSTRY = {
  IT: "IT Services",
  Banks: "Private Bank",
  "Financial Services": "NBFC",
  Pharma: "Formulations",
  Healthcare: "Hospitals & Diagnostics",
  Auto: "Automobiles",
  "Auto Components": "Auto Ancillaries",
  "Capital Goods": "Industrial Machinery",
  Defence: "Defence Equipment",
  Railways: "Rail Infrastructure",
  Renewables: "Renewable Energy",
  Power: "Power & Utilities",
  Chemicals: "Commodity Chemicals",
  "Specialty Chemicals": "Specialty Chemicals",
  Consumer: "Consumer Durables",
  FMCG: "Packaged Goods",
  "Real Estate": "Real Estate Development",
  Telecom: "Telecom Services",
  Infrastructure: "Infrastructure & Construction",
  Metals: "Metals & Mining",
  Mining: "Mining",
  Textiles: "Textiles & Apparel",
};

// Ordered keyword rules — first match wins. Deliberately crude: these CSVs carry no
// real sector data, so this is a name-based heuristic placeholder, not a classification.
const SECTOR_RULES = [
  [/\bbank(ing)?\b/i, "Banks"],
  [/\bdefen[cs]e|aerospace\b/i, "Defence"],
  [/\brail(way)?s?\b/i, "Railways"],
  [/\bsolar|renewable|wind\s?energy|green\s?energy\b/i, "Renewables"],
  [/\btele(com|communication)/i, "Telecom"],
  [/\brealty|real\s?estate|housing|properties\b/i, "Real Estate"],
  [/\binfra(structure)?|highways?|roads?|ports?\b/i, "Infrastructure"],
  [/\bmining|minerals?|coal\b/i, "Mining"],
  [/\bsteel|iron\s?&?\s?steel|alloys?|copper|aluminium|aluminum|zinc\b/i, "Metals"],
  [/\btextiles?|spinning|weav|fabrics?|apparel|garments?|yarns?\b/i, "Textiles"],
  [/\bauto\s?components?|ancillar|forgings?|castings?|bearings?\b/i, "Auto Components"],
  [/\bmotors?|automobiles?|automotive|vehicles?|tyres?|tires?\b/i, "Auto"],
  [/\bagro\s?chem|dyes?|pigments?|specialty\s?chem|speciality\s?chem\b/i, "Specialty Chemicals"],
  [/\bchemicals?|petrochem(icals?)?|fertilisers?|fertilizers?\b/i, "Chemicals"],
  [/\bpharma(ceuticals?)?|drugs?|formulations?|biotech\b/i, "Pharma"],
  [/\bhospitals?|healthcare|diagnostics?|medical\b/i, "Healthcare"],
  [/\bpower|electric(ity|al)?|energy\b/i, "Power"],
  [/\bsoftware|technolog(y|ies)|infotech|informatics|systems?|data\b/i, "IT"],
  [/\bfoods?|beverages?|dairy|fmcg|agro\b/i, "FMCG"],
  [/\bconsumer|retail|appliances?\b/i, "Consumer"],
  [/\bengineering|machinery|equipments?|industrial\b/i, "Capital Goods"],
  [/\bfinance|financial|capital|investments?|securities|nbfc|leasing\b/i, "Financial Services"],
];

const ARCHETYPES = [
  "emerging_multibagger",
  "early_accelerator",
  "quality_compounder",
  "steady_large_cap",
  "momentum_high_pe",
  "surprise_priced_in",
  "value_turnaround",
  "cyclical_recovery",
  "decelerating",
  "decliner",
];
// Weighted so most of the universe is unremarkable, matching a real long-tail market.
const ARCHETYPE_WEIGHTS = [8, 8, 10, 15, 8, 7, 10, 10, 14, 10];

const TIER_BUCKETS = [
  { tier: "large", weight: 2 },
  { tier: "mid", weight: 10 },
  { tier: "small", weight: 40 },
  { tier: "micro", weight: 48 },
];

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) / 4294967296;
}

function weightedPick(seedKey, items, weights) {
  const r = hashString(seedKey) * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r < acc) return items[i];
  }
  return items[items.length - 1];
}

function classifySector(name, symbolSeed) {
  for (const [re, sector] of SECTOR_RULES) {
    if (re.test(name)) return sector;
  }
  const idx = Math.floor(hashString(`sector-${symbolSeed}`) * SECTORS.length);
  return SECTORS[idx];
}

function sanitizeSymbol(raw) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]/g, "");
}

function cleanName(name) {
  return name.trim().replace(/\s+/g, " ").replace(/\.$/, "").replace(/\bLtd\b\.?$/i, "Limited");
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => l.split(","));
}

const bseRows = parseCsv(readFileSync(path.join(ROOT, "company_info/BSE.csv"), "utf8")).slice(1);
const nseRows = parseCsv(readFileSync(path.join(ROOT, "company_info/NSE.csv"), "utf8")).slice(1);

// symbol, name, series/status, ..., isin(col idx varies)
// BSE's "Equity" instrument list also carries mutual-fund/ETF "permitted to trade" entries
// (e.g. "Reliance Mutual Fund-Permitted") — not operating companies, exclude them.
const NON_COMPANY_NAME = /mutual fund|\betf\b|index fund/i;

const bseByIsin = new Map();
for (const cols of bseRows) {
  const [, issuerName, securityId, , status, , , isin, instrument] = cols;
  if (status !== "Active" || instrument !== "Equity") continue;
  if (!isin || !securityId) continue;
  if (NON_COMPANY_NAME.test(issuerName)) continue;
  bseByIsin.set(isin.trim(), { symbol: securityId.trim(), name: issuerName.trim() });
}

const nseByIsin = new Map();
for (const cols of nseRows) {
  const [symbol, name, , , , , isin] = cols.map((c) => c.trim());
  if (!isin || !symbol) continue;
  if (NON_COMPANY_NAME.test(name)) continue;
  nseByIsin.set(isin, { symbol, name });
}

const allIsins = new Set([...bseByIsin.keys(), ...nseByIsin.keys()]);

const usedSymbols = new Set();
const seeds = [];

for (const isin of allIsins) {
  const nse = nseByIsin.get(isin);
  const bse = bseByIsin.get(isin);
  const source = nse ?? bse; // prefer NSE symbol/name when listed on both
  if (!source) continue;

  let symbol = sanitizeSymbol(source.symbol);
  if (!symbol) continue;
  if (usedSymbols.has(symbol)) {
    let suffix = 2;
    while (usedSymbols.has(`${symbol}${suffix}`)) suffix++;
    symbol = `${symbol}${suffix}`;
  }
  usedSymbols.add(symbol);

  const name = cleanName(source.name);
  const sector = classifySector(name, symbol);
  const industry = SECTOR_INDUSTRY[sector];
  const archetype = weightedPick(`archetype-${symbol}`, ARCHETYPES, ARCHETYPE_WEIGHTS);
  const marketCapTier = weightedPick(
    `tier-${symbol}`,
    TIER_BUCKETS.map((b) => b.tier),
    TIER_BUCKETS.map((b) => b.weight)
  );

  seeds.push({ symbol, name, sector, industry, archetype, marketCapTier, isin });
}

seeds.sort((a, b) => a.name.localeCompare(b.name));

// Emitted as plain string tuples (no per-item structural check against a union-heavy
// object type) — a directly-typed 5k+ element object array blows up the TS checker with
// "Expression produces a union type that is too complex to represent". A single .map()
// with an `as` cast at the end is cheap regardless of array size.
const header = `// AUTO-GENERATED by scripts/build-universe.mjs from company_info/BSE.csv + NSE.csv.
// Do not hand-edit — re-run the script to regenerate. Sector/industry/archetype/market-cap
// tier are heuristic placeholders (name-keyword based); financials remain mock until a real
// data source is wired in.
import { CompanySeed } from "@/lib/mock/generate-company";

// [symbol, name, sector, industry, archetype, marketCapTier]
const RAW: readonly [string, string, string, string, string, string][] = [
`;

const body = seeds
  .map((s) => `  [${JSON.stringify(s.symbol)}, ${JSON.stringify(s.name)}, ${JSON.stringify(s.sector)}, ${JSON.stringify(s.industry)}, ${JSON.stringify(s.archetype)}, ${JSON.stringify(s.marketCapTier)}],`)
  .join("\n");

const footer = `\n];

export const REAL_COMPANY_SEEDS: CompanySeed[] = RAW.map(
  ([symbol, name, sector, industry, archetype, marketCapTier]) =>
    ({ symbol, name, sector, industry, archetype, marketCapTier }) as CompanySeed
);
`;

writeFileSync(path.join(ROOT, "src/lib/mock/real-companies-seed.ts"), header + body + footer, "utf8");

console.log(`Wrote ${seeds.length} companies to src/lib/mock/real-companies-seed.ts`);
console.log(`  NSE-sourced: ${[...allIsins].filter((i) => nseByIsin.has(i)).length}`);
console.log(`  BSE-only: ${[...allIsins].filter((i) => !nseByIsin.has(i) && bseByIsin.has(i)).length}`);

const sectorCounts = {};
for (const s of seeds) sectorCounts[s.sector] = (sectorCounts[s.sector] ?? 0) + 1;
console.log("Sector distribution:", sectorCounts);
