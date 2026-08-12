# TradeX — Product Requirements Document

## Purpose

Build a modern web application UI for a personal Indian stock-market intelligence platform.

The purpose of this platform is NOT to simply show the "top stocks" or predict which stock will go up tomorrow. The goal is to track the entire universe of approximately 3,000 Indian listed companies and identify companies whose business trajectory is changing early, especially potential future multibaggers.

**Phase 1 scope:** UI first. Do not spend time implementing real financial APIs, authentication, databases, brokerage integration, or trading functionality yet. Use realistic mock data so that the entire interface feels functional. The real data layer will be connected later.

## Tech Stack

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where useful
- Recharts or another suitable charting library for charts

The UI should look like a serious professional investment-research terminal, not a generic fintech landing page.

The design should be dark-first, information-dense, clean, modern, and optimized for desktop. It should feel somewhat like a combination of Bloomberg, TradingView, Screener.in, and a modern AI analytics product, but do NOT copy any of their exact designs.

## Core Product Concept

The platform maintains the complete universe of Indian listed companies.

Every company remains in the database. Do NOT permanently filter companies from the universe.

Instead, the platform evaluates companies through multiple independent lenses:

1. Quality Score
2. Growth Score
3. Earnings Acceleration Score
4. Margin Expansion Score
5. Earnings Surprise Score
6. Valuation Score
7. Momentum Score
8. Institutional Activity Score
9. Order Book / Business Expansion Score
10. Early Multibagger Score

The important concept is that a company can have a mediocre absolute score but an extremely strong "change" or "acceleration" score.

For example:

**Company A** — Quality: 90, Growth: 60, Acceleration: 30
**Company B** — Quality: 45, Growth: 85, Acceleration: 97

Company B should be surfaced as an emerging opportunity even though Company A is currently the better-established business.

## Main Navigation

Left sidebar with:

- Dashboard
- Market Universe
- Emerging Opportunities
- Multibagger Radar
- Earnings Radar
- Earnings Surprises
- Growth Acceleration
- Margin Expansion
- Order Book Radar
- Momentum
- Valuation
- Sector Intelligence
- Watchlist
- Alerts
- Backtesting
- Paper Portfolio
- Research
- Settings

At the bottom, show current market status: NIFTY 50, SENSEX, Market status (Open/Closed).

## Main Dashboard

Immediately answers: "What is happening in the Indian stock universe today?"

**Top section** — cards with small sparklines:

- Total companies tracked
- Companies with positive earnings acceleration
- Companies with accelerating revenue
- Companies with accelerating profit
- Companies with margin expansion
- Companies with positive earnings surprises
- Companies with unusual volume
- New companies entering the Multibagger Radar

**"Emerging Signals"** — companies where something meaningful has recently changed. Each signal has a severity indicator. Example rows:

- ABC Industries — Revenue acceleration, Profit acceleration, Margin expansion, Price +4.2%
- XYZ Engineering — Large order received, Order book +62%, Price +2.1%
- DEF Technologies — Earnings surprise +31%, Institutional buying, Price +6.8%

**"Biggest Fundamental Changes"** — companies ranked by change rather than absolute quality.

## Company Universe Page

Powerful table containing all ~3,000 companies.

Columns: Rank, Company, Symbol, Sector, Industry, Market Cap, Price, 1D %, 1W %, 1M %, Revenue Growth, Profit Growth, EBITDA Margin, Margin Change, ROE, ROCE, Debt/Equity, PE, Earnings Acceleration, Growth Score, Quality Score, Multibagger Score.

The table must support: search, sorting, column selection, filters, sector filtering, market-cap filtering, score filtering, growth filtering, valuation filtering, profitability filtering.

**Important:** The user should be able to see ALL companies. Do not automatically hide companies because their scores are low.

## Emerging Opportunities Page

Title: "Emerging Opportunities"
Subtitle: "Companies whose fundamentals are improving faster than the market has recognized."

Ranking system based primarily on CHANGE rather than absolute size.

Columns: Company, Current Score, Previous Score, Score Change, Revenue Growth, Previous Revenue Growth, Profit Growth, Previous Profit Growth, Margin, Margin Change, Price Change, Volume Change, Valuation, Signal Strength.

Each row should show WHY the company moved up, e.g.:

- "Profit growth accelerated from 22% → 68%"
- "EBITDA margin expanded from 11.2% → 15.8%"
- "Revenue growth accelerated from 14% → 29%"
- "Stock price only +6%"

The last signal is particularly important because it indicates that the business may be improving faster than the market price.

## Multibagger Radar

Title: "Multibagger Radar"
Subtitle: "Early-stage companies showing sustained improvement in business fundamentals."

Do NOT rank simply by market capitalization or current profitability. Scoring should emphasize:

- Revenue acceleration
- Profit acceleration
- Margin expansion
- ROCE improvement
- Increasing addressable market
- Order-book growth
- Capacity expansion
- Management guidance
- Institutional accumulation
- Debt reduction
- Operating cash-flow improvement
- Reasonable valuation
- Low prior price appreciation

Large visual ranking table. Each company has a "Why this is interesting" expandable section, e.g.:

> Company: XYZ Ltd.
> Multibagger Score: 87/100
>
> Revenue growth: 12% → 27% → 41%
> Profit growth: 8% → 32% → 79%
> EBITDA margin: 13% → 16% → 20%
> Order book: +54%
> Stock price: +8% in 6 months
> Valuation: 24× PE

Then show "Potential thesis" with an AI-generated explanation.

**Important disclaimer in the UI:** "This is a research signal, not a buy recommendation."

## Company Detail Page

**Header:** Company name, Ticker, Sector, Market Cap, Current Price, 1D, 1W, 1M, 1Y.

Overall score: "Multibagger Radar Score: 82/100"

Radar chart for: Quality, Growth, Acceleration, Valuation, Momentum, Profitability, Financial Strength, Institutional Activity.

**Sections:**

- Business Overview
- Financial Growth (Revenue chart, Profit chart, EBITDA chart, Margin chart)
- Cash Flow
- Debt
- ROE / ROCE
- Valuation
- Peer Comparison
- Shareholding
- Promoter Activity
- Institutional Activity
- Recent Results
- Recent News
- Orders / Contracts
- Management Guidance
- Risk Factors
- AI Research Summary

**Most important — "What's Changing?" section.** Highlights changes in the business rather than static numbers, e.g.:

- Revenue growth: +12% → +29%
- Profit growth: +18% → +71%
- EBITDA margin: 14% → 18%
- Debt: ₹420 Cr → ₹280 Cr
- Institutional ownership: 6.2% → 9.8%

This should visually make the trajectory obvious.

## Earnings Radar

Tracks upcoming and recently released quarterly results.

**Sections:** Upcoming Results, Results Released Today, Results Released This Week.

For each company show: Expected revenue, Actual revenue, Revenue surprise, Expected profit, Actual profit, Profit surprise, Margin surprise, Management guidance, Stock reaction.

Visual indicators: Positive surprise, Negative surprise, In line.

**Key idea: GOOD RESULT ≠ GOOD STOCK SIGNAL.** The platform should specifically track "Actual result vs market expectation."

## Earnings Surprise Page

Ranking of companies where actual earnings materially exceeded expectations.

Columns: Company, Expected EPS, Actual EPS, Surprise %, Revenue Surprise %, EBITDA Surprise %, Stock Reaction.

Also show whether the stock had already rallied before the result, e.g.:

> "Earnings surprise: +42%"
> "Stock had already risen 35% in previous 3 months."

This should reduce the signal strength because the market may already have priced it in.

## Sector Intelligence

Sector dashboard covering: IT, Banks, Financial Services, Pharma, Healthcare, Auto, Auto Components, Capital Goods, Defence, Railways, Renewables, Power, Chemicals, Specialty Chemicals, Consumer, FMCG, Real Estate, Telecom, Infrastructure, Metals, Mining, Textiles, etc.

For every sector show: Sector performance, Revenue growth, Profit growth, Average margin, Margin expansion, Earnings surprises, Number of companies accelerating, Number of companies decelerating, Average valuation.

Then show "Emerging sectors" based on improving fundamentals.

## Backtesting

Page where the user can test signals historically. Example strategy:

- Revenue growth acceleration > 20%
- Profit growth acceleration > 30%
- Margin expansion > 200 bps
- PE < 40
- Stock price 6M return < 20%

Then show: Number of signals, Win rate, Average return, Median return, Maximum drawdown, Average holding period, 1M/3M/6M/12M return, and an equity curve chart.

This page is extremely important because the platform should eventually prove whether its signals actually work.

## Paper Portfolio

Simulated portfolio showing: Capital, Invested, Cash, P&L, Win rate, Portfolio return, NIFTY return, Alpha.

Allow the user to add a stock based on a signal, recording: Date, Entry price, Signal, Score, Reason for purchase. Then track performance automatically.

## Alerts

Alerts system, examples:

- "XYZ Ltd entered Multibagger Radar."
- "ABC Ltd profit growth accelerated from 20% to 71%."
- "DEF Ltd received an order worth 2.4× annual revenue."
- "Company X EBITDA margin expanded by 420 bps."
- "Company Y reported earnings 34% above expectations."
- "Company Z dropped from score 82 → 61."

Allow filters for alert types.

## AI Research Assistant

AI panel accessible throughout the application. Answers questions using the platform's data, e.g.:

- "Why did this company enter the Multibagger Radar?"
- "Compare this company with its competitors."
- "Which companies have accelerating profits but haven't rallied yet?"
- "Show me companies similar to early-stage Cupid."
- "Find companies where revenue growth accelerated for three consecutive quarters."
- "Why did this stock fall despite strong results?"
- "Which sectors currently have the highest earnings acceleration?"

The AI should always show the underlying signals/data used for its conclusion. **Do NOT make the AI a black box.**

## Visual Design

Professional dark interface:

- Dark background
- Subtle borders
- Compact tables
- Green for positive signals
- Red for negative signals
- Amber/yellow for warnings
- Neutral gray for unchanged
- Clean typography
- Minimal gradients
- No excessive animations
- No flashy crypto-style UI

The application should feel like a serious quantitative research terminal.

## Responsiveness

Desktop is the primary target. Make it usable on laptop screens. Tables should support horizontal scrolling.

## Architecture

For now, create mock data and reusable components.

Reusable components: Sidebar, TopBar, MetricCard, StockTable, SignalBadge, ScoreBadge, Sparkline, StockChart, ScoreBreakdown, CompanyHeader, FinancialChart, SectorCard, AlertCard, AIResearchPanel, FilterBar.

Create realistic mock data for at least 30 companies across different Indian sectors so the UI looks alive.

Do not hardcode everything into individual pages. Create reusable data structures so that mock data can later be replaced with APIs/database data.

## Important Product Principle

The platform should NOT be designed around: "Which are the top 10 stocks?"

It should be designed around: **"What is changing?"**

The entire product should preserve the complete ~3,000-company universe and use multiple analytical lenses to discover:

1. Excellent existing businesses.
2. Rapidly growing businesses.
3. Businesses experiencing earnings acceleration.
4. Businesses experiencing margin expansion.
5. Businesses receiving large new orders.
6. Businesses beating expectations.
7. Businesses where institutional interest is increasing.
8. Small companies whose fundamentals are improving before the market fully recognizes them.

Build the complete frontend UI with mock data first. Prioritize functionality, information hierarchy, tables, charts, filtering, scoring visualization, and navigation over decorative elements.
