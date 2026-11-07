# Investment Dashboard

Personal dashboard to track investments across accounts and currencies in one
place:

- **Stocks / ETFs** — holdings and trades synced from Interactive Brokers via
  IBKR Flex (read-only, token encrypted in Supabase Vault).
- **CDTs** — Colombian term deposits with accrued interest, maturity buckets and
  market rate comparison.
- **Custom assets** — crypto, real estate, private businesses, anything else.
- **Overview** — consolidated net worth, historical series, allocation and
  portfolio signal from the companion `market-agent` app.

It is a single-user-oriented app built on Supabase Auth + RLS: every row belongs
to a user. Some integrations (Splitstream budget card, Notion net-worth sync)
are enabled only for the address in `OWNER_EMAIL`.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript, Server Actions)
- **Tailwind CSS 4** (CSS-first theme) + `strata` UI primitives
- **Supabase** — auth, Postgres, RLS, Vault, Edge RPCs
- **TanStack Query** — client-side data fetching
- **Recharts** — portfolio charts
- **Vitest** — unit tests

## Routes

| Route | Purpose |
| --- | --- |
| `/overview` | Consolidated value, history, allocation, portfolio snowflake |
| `/stocks` | Brokerage accounts, IBKR Flex connections, holdings, recent trades |
| `/cdts` | CDT list, accrued value, maturity buckets, market rates by term |
| `/custom` | Manual custom assets |
| `/settings` | Profile, base currency, broker connection |
| `/login` | Email/password auth |
| `/api/cron/sync-ibkr` | Scheduled IBKR sync (Vercel Cron, fail-closed) |
| `/api/feedback` | In-app feedback form (Resend + Upstash rate limit) |

## Local development

Requirements: Node.js 20.9+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
# fill in Supabase (required) and the optional integrations you use
pnpm dev
```

Open http://localhost:3000, sign up, then add accounts and holdings from the app.

### Scripts

```bash
pnpm dev        # development server
pnpm build      # production build
pnpm start      # run the production build
pnpm lint       # ESLint
pnpm test       # Vitest (unit tests)
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | cron only | Service-role client used by the scheduled sync; never expose to the browser |
| `NEXT_PUBLIC_APP_URL` | recommended | Public app URL for links and auth redirects |
| `CRON_SECRET` | cron only | Bearer secret validated by `/api/cron/sync-ibkr`; must be plain ASCII |
| `NEXT_PUBLIC_MARKET_AGENT_URL` | optional | Companion `market-agent` app URL for symbol links |
| `NEXT_PUBLIC_SPLITSTREAM_URL` | optional | Splitstream budget app URL (owner only) |
| `OWNER_EMAIL` | optional | Enables owner-only Notion sync and Splitstream card |
| `NOTION_TOKEN` | optional | Notion integration token |
| `NOTION_PATRIMONIO_DS` | optional | Notion data source for the monthly net-worth table |
| `NOTION_INVERSIONES_DS` | optional | Notion data source for IBKR/CDT balances |
| `RESEND_API_KEY` | feedback only | Sends the feedback email |
| `FEEDBACK_INBOX` | feedback only | Destination inbox |
| `FEEDBACK_FROM_ADDRESS` | optional | Verified Resend sender |
| `UPSTASH_REDIS_REST_URL` | feedback only | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | feedback only | Rate limiting |

The Notion sync stays disabled unless `OWNER_EMAIL`, `NOTION_TOKEN`,
`NOTION_PATRIMONIO_DS` and `NOTION_INVERSIONES_DS` are all set. The cron route
refuses to run without `CRON_SECRET`.

## Supabase setup

1. Create a project at https://supabase.com.
2. Put the URL, anon key and service-role key in `.env.local`.
3. Apply the SQL files in [`supabase/migrations/`](./supabase/migrations) in
   numeric order (SQL editor or `supabase db push`).
4. Enable email/password auth and add `http://localhost:3000/auth/callback` (and
   your production callback) to the allowed redirect URLs.

> The committed migrations start at `0007`; the base schema (`profiles`,
> `accounts`, `holdings`, `transactions`, `broker_connections` and their RLS
> policies) predates this repository's migration history and is not included.
> A brand-new project needs that base schema restored from an existing Supabase
> project first. The types in [`src/types/database.ts`](./src/types/database.ts)
> describe the expected shape.

The IBKR token is stored through Supabase Vault. The app decrypts it only in
server-side code: `get_broker_secret` for a session and
`get_broker_secret_service` for the service-role cron.

## IBKR Flex setup

1. In the IBKR portal, create an **Activity Flex Query** with the sections you
   need: **Open Positions** for holdings and **Trades** for the transaction
   history.
2. Generate a Flex Web Service token (read-only) in the portal.
3. In the dashboard, open **Stocks → Connect IBKR**, enter the Flex Query ID and
   token. The token is encrypted in Vault; only the query ID is stored in clear
   text.
4. Press **Sincronizar** to run the first sync.

The client calls the IBKR v3 endpoint
(`https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService`) and
retries transient errors with bounded backoff. See
[`docs/ibkr-flex-sync.md`](./docs/ibkr-flex-sync.md) for the endpoint history,
retry policy and manual `curl` checks.

### Scheduled sync

`vercel.json` runs `/api/cron/sync-ibkr` every day at 22:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET`. The route uses the service-role client,
decrypts each connection token through Vault, replaces holdings, appends new
trades and records `last_sync_status` / `last_sync_error`.

To trigger it manually:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.example.com/api/cron/sync-ibkr
```

## Project layout

```text
src/app/(dashboard)   Overview, stocks, CDTs, custom assets, settings
src/app/api           Cron and feedback route handlers
src/lib               Portfolio math, FX, IBKR Flex, Notion, history, rates
src/components        UI primitives, dashboard widgets, feedback
supabase/migrations   RLS, Vault RPCs and owner-only RPCs
docs                  Architecture notes and handoffs
```

## Docs

- [`docs/handoff-2026-08.md`](./docs/handoff-2026-08.md) — session handoff,
  architecture and backlog.
- [`docs/ibkr-flex-sync.md`](./docs/ibkr-flex-sync.md) — IBKR Flex endpoint and
  retry behaviour.
- [`AGENTS.md`](./AGENTS.md) — Next.js 16 caveats for coding agents.

## Contributing and license

Source-available under the **PolyForm Noncommercial License 1.0.0**. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for contributor terms and commercial
licensing, and [`LICENSE`](./LICENSE) for the full text.
