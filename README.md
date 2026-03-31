# Google Ads ROI Calculator

A production-ready web tool for account managers to estimate Google Ads revenue potential for clients based on industry, service mix, cost per lead, and close rate.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

The calculator answers: **If this client spends $X/month on Google Ads, and their close rate is Y%, and their average job value is $Z, then they can expect approximately $N/month in new revenue potential.**

### Formulas

```
leads/month    = monthly ad spend / cost per lead
jobs/month     = leads × close rate
revenue/month  = jobs × average job value
```

For multiple services, the budget is split by allocation percentages and each service is calculated separately, then summed.

## Workflow

1. **Client Info** — Enter client name, select industry, optionally paste website text or GBP description
2. **Service Selection** — Select which services the client offers; adjust CPL and job values per service
3. **Budget & Sales** — Set monthly ad spend, close rate, and optional gross margin
4. **Results** — See leads, jobs, and revenue estimates with per-service breakdown
5. **Export** — Copy a client-facing summary or internal notes

## Project Structure

```
src/
  app/
    page.tsx              # Main page (all state management)
    layout.tsx            # Root layout
    globals.css           # Global styles
  components/
    ClientInputs.tsx      # Client name, industry, website text
    ServiceSelection.tsx  # Service checkboxes, CPL, job value per service
    BudgetSalesInputs.tsx # Ad spend, close rate, rounding mode
    Results.tsx           # Results cards and per-service table
    ExportSummary.tsx     # Client-facing and internal summary export
  lib/
    types.ts              # TypeScript type definitions
    benchmarks.ts         # Benchmark data access functions
    calculations.ts       # Core calculation engine + formatters
    service-extraction.ts # Text-based service detection
  data/
    benchmarks.json       # Seed benchmark dataset (EDIT THIS)
```

## Updating Industry Benchmarks

**All seed data is placeholder.** Before using with real clients, replace the values in `src/data/benchmarks.json`.

Each benchmark entry:

```json
{
  "industryId": "plumbing",
  "industryName": "Plumbing",
  "serviceName": "Drain Cleaning",
  "cplLow": 20,
  "cplMid": 40,
  "cplHigh": 70,
  "avgJobValue": 350,
  "recommendedMinAdSpend": 800,
  "recommendedTargetAdSpend": 1500,
  "notes": "Source and rationale here",
  "source": "Name of data source",
  "confidence": "high"
}
```

- `confidence`: `"high"`, `"medium"`, or `"low"` — displayed in the UI
- `notes` / `source`: shown to the AM as context
- Set `cplLow/Mid/High` to `null` if unknown (the UI will prompt for manual entry)

To add a new industry, add entries with a new `industryId` — the app picks them up automatically.

## Accuracy Rules

- No benchmarks are fabricated. All seed data is clearly labeled as demonstration-only.
- Missing benchmarks show "No benchmark available" and require manual entry.
- Custom/manual values are flagged in output as "custom estimate based on user-entered values."
- Formulas are always visible in the UI.
- Confidence levels are shown per service.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- No database required — JSON seed data

## Build for Production

```bash
npm run build
npm start
```
