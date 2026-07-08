# ROI Calculator — Deployment Guide

## Stack
- **Framework:** Next.js 16 (App Router)
- **Hosting:** Vercel
- **Database:** None (all data is static JSON in `src/data/`)
- **AI:** Anthropic Claude (Sonnet 4.6) via direct API call

## Vercel Setup (new project)

1. Import repo from GitHub into the Cogent Vercel org
2. Framework preset: **Next.js** (auto-detected)
3. Build command: `next build` (default)
4. Output directory: `.next` (default)
5. Node version: 18.x or 20.x

## Environment Variables

See `.env.example`. Set these in Vercel → Project Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers AI Generate Industry Profile |
| `GENERATE_PASSWORD` | No | Password gate for AI feature (default: `cogent.123`) |

## No database, no migrations needed.

All industry benchmark data lives in `src/data/*.json`. No Supabase, no external DB.

## After deploy

- The calculator is publicly accessible at the Vercel URL
- AI Generate requires the password set in `GENERATE_PASSWORD`
- To add industries: edit `src/data/` JSON files and push to trigger redeploy

## Local dev

```bash
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY
npm install
npm run dev   # http://localhost:3000
```
