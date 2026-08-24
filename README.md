<p align="center">
  <img src="public/brand/tradex-logo.png" alt="TradeX" width="420" />
</p>

<p align="center">
  <strong>See the change before the market does.</strong><br />
  An Indian equity research workspace built to surface improving business fundamentals.
</p>

<p align="center">
  <a href="#getting-started">Get started</a> ·
  <a href="#what-tradex-does">Product</a> ·
  <a href="#data-and-disclaimers">Data &amp; disclaimers</a>
</p>

---

## Why TradeX

TradeX is an equity-research platform for the Indian listed-company universe. It is designed around a simple investing question: **what is changing inside a business before that change is fully reflected in its market price?**

Rather than treating a high score as the whole story, TradeX puts trajectory first—revenue and profit acceleration, margin expansion, earnings surprises, business announcements, valuation, momentum, and market participation. The result is a focused workspace for researching emerging opportunities, not a stock-tip feed.

## What TradeX does

- Tracks companies across NSE and BSE, using a unified ISIN-based company record.
- Ingests and preserves market prices, financial statements, corporate announcements, news, and shareholding data.
- Surfaces fundamental change through dashboards, earnings views, sector intelligence, and dedicated research screens.
- Helps users investigate ideas with company-level charts, score breakdowns, peer context, watchlists, alerts, paper portfolios, and backtesting workflows.
- Keeps research signals distinct from recommendations: the platform is built to support judgement, not replace it.

## Product areas

| Area | Purpose |
| --- | --- |
| Dashboard | A daily view of market-wide signals and the largest fundamental shifts. |
| Market Universe | Browse and filter the listed-company universe without hiding low-scoring companies. |
| Emerging Opportunities | Find businesses whose operating trajectory is improving faster than consensus may recognize. |
| Multibagger Radar | Investigate sustained, early-stage fundamental improvement—not just size or past returns. |
| Earnings & Signals | Review results, surprises, growth acceleration, margins, order-book activity, valuation, and momentum. |
| Company Research | Bring financial history, price action, announcements, and key changes into one company view. |
| Portfolio Tools | Monitor watchlists and alerts, test signal ideas, and track a paper portfolio. |

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · TanStack Table · Recharts · shadcn/ui

## Getting started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL, when using the live data layer

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The research interface can render with its included mock data when a database is unavailable. To enable database-backed company and ingestion features, create a `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/tradex"

# Required only for the Stoxim fundamentals import.
STOXIM_API_KEY="your-key"
```

Then apply the schema:

```bash
npm run db:migrate
```

## Data workflows

The ingestion scripts are intended to be rerunnable and retain historical records. Use the commands that fit the source you want to refresh:

```bash
npm run ingest:nse
npm run ingest:bse
npm run ingest:prices
npm run ingest:financials
npm run ingest:announcements
npm run ingest:shareholding
npm run ingest:news
npm run ingest:fundamentals
```

For the exchange-universe imports, the bundled CSV files in `company_info/` are used by default. You can point to replacements with `NSE_CSV_PATH` or `BSE_CSV_PATH`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Project structure

```text
src/app/          Application routes and API endpoints
src/components/   Research-terminal UI and shared components
src/lib/data/     Exchange clients, normalization, ingestion, and data utilities
prisma/           Database schema and migrations
scripts/          Data-ingestion entry points
company_info/     NSE and BSE source-universe CSV files
public/brand/     TradeX brand assets
```

## Data and disclaimers

TradeX is a research product. Signals, scores, charts, and AI-assisted summaries are informational and **not investment advice, research recommendations, or an offer to buy or sell securities**. Verify data independently and consult a qualified financial professional before making investment decisions.

The interface currently includes realistic mock research data alongside the live PostgreSQL-backed ingestion layer. Treat any sample figures or signals as illustrative unless their source and freshness are explicitly shown in the product.

## Status

TradeX is under active development. The present focus is a robust Indian-market data foundation and a high-signal research experience; execution, brokerage connectivity, and personalised investment advice are out of scope.

---

<p align="center">Built for patient, evidence-led equity research.</p>
