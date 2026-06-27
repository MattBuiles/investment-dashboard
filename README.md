# Investment Dashboard

Personal dashboard to track investments across multiple accounts in one place:

- **Stocks / ETFs** — synced from Interactive Brokers via Web API (OAuth 2.0)
- **CDTs** — manual entry (bank, amount, rate, term)
- **Custom assets** — crypto, real estate, anything else

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS 4** (CSS-first theme)
- **Supabase** — auth + Postgres + RLS
- **TanStack Query** — client-side data fetching
- **Recharts** — performance charts
- **lucide-react** — icons

## Design

Hybrid Apple/Notion base with glassmorphism on hero stats. Light + dark mode
follow `prefers-color-scheme`. Tabular numerals on all monetary figures.

## Status

Scaffold in progress. See `AGENTS.md` for Next.js 16 caveats.

| Area | Status |
| --- | --- |
| Next.js scaffold | done |
| Theme + UI primitives | done |
| Dashboard routes (placeholder) | done |
| Supabase auth wiring | pending |
| IBKR Web API OAuth | pending |
| Deployment (Vercel) | pending |

## Local dev

```bash
pnpm install
cp .env.example .env.local
# fill Supabase + IBKR values
pnpm dev
```

## IBKR setup

1. Register at https://www.interactivebrokers.com/en/trading/ib-api.php → OAuth Self-Service.
2. Generate RSA keypair: `openssl genrsa -out ibkr_private.pem 2048`.
3. Upload the public key to the IBKR portal, copy the `consumer_key`.
4. Set `IBKR_CONSUMER_KEY` and `IBKR_PRIVATE_KEY_PATH` in `.env.local`.

## Supabase setup

1. Create a project at https://supabase.com (free tier).
2. Copy URL + anon key into `.env.local`.
3. Run migrations from `supabase/migrations/` (pending).
