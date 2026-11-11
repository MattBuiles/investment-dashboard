# Session report & handoff — August 2026

Investment ecosystem: **investment-dashboard** (Tracking: what I own, how it is
doing) + **market-agent** (Analysis: what is good, when to buy). Two separate
repos integrated through a shared Supabase project and a common design system
(**invest-ui**).

---

## 1. What was done

### UI/UX rework (Phases 1–4) — complete, in production
- **invest-ui** (`MattBuiles/invest-ui`, public, consumed as a git dependency
  without a build step): light + dark tokens, primitives (Button, Card, Badge,
  Field, Tabs, Table, Skeleton, EmptyState, ThemeToggle), charts (ScoreGauge,
  Snowflake) and ThemeProvider.
- **market-agent**: PriceChart (candles + EMAs + S/R zones), 5-axis Snowflake,
  DCF / intrinsic value, enriched `ma_signals` (axes + fair value), light mode.
- **dashboard**: adopts invest-ui (jade, light/dark), Portfolio Snowflake on the
  overview, mobile nav drawer, skeletons, CDT maturity badges, cross-app URLs
  pointing to production (not localhost).

### This session
| PR | Repo | Delivery |
|----|------|----------|
| #9 (previous) | dashboard | Scheduled IBKR sync (daily cron + Vault from service_role) |
| **#11** | dashboard | **Fix**: the session proxy redirected `/api/cron` to login → the cron was a no-op. Exempted. |
| **#10** | dashboard | Enriched CDTs: 90/180/360 buckets, rate prefill by bank, your-CDT-vs-market comparison, Tabs by term |
| **#1** | invest-ui | Modal + ConfirmProvider/useConfirm |
| **#12** | dashboard | ConfirmDialog replaces the 6 `window.confirm()` calls |
| **#13** | dashboard | IBKR multi-connection |
| **#14** | dashboard | IBKR transaction history (Trades section parsing → `transactions` table) |
| **#2** | invest-ui | Toast/ToastProvider/useToast + Sparkline |
| **#15** | dashboard | Success toasts (save/delete/sync) + historical CDT rate trend (Sparkline) |

### Relevant architecture / security
- **Single brain**: market-agent computes score/snowflake/fair value → `ma_signals`;
  the dashboard only displays them. Shared tables are prefixed `ma_*`.
- **Scheduled IBKR sync**: Vercel cron (22:00 and 06:00 UTC) → `/api/cron/sync-ibkr`
  (fail-closed via `CRON_SECRET`) → service-role client → RPC
  `get_broker_secret_service` (SECURITY DEFINER, executable **only** by
  service_role, audited) decrypts the Flex token from Vault → upsert holdings +
  transactions per connection. Verified in production: no auth → 401.
- invest-ui is pinned by **commit** in `pnpm-lock`; after merging in invest-ui,
  run `pnpm update invest-ui` in the consumer to bump it.
- **Nov 2026 — IBKR sync fix**: the Flex client used the legacy v2 servlet host
  with `v=3` and always failed with `1001`. It now uses the v3 endpoint
  (`ndcdyn.../FlexWebService`) and retries transient codes. Details in
  [`docs/ibkr-flex-sync.md`](./ibkr-flex-sync.md).

### User action items (not code)
- IBKR: add the **Trades** section to the Flex Query (currently Open Positions
  only) and run a sync → populates `transactions`.
- Confirm the scheduled sync end-to-end with the real `CRON_SECRET` (or wait for
  the next 22:00 or 06:00 UTC run). Note: `CRON_SECRET` must be plain ASCII (it goes in a header).

---

## 2. Backlog for teammates (independent tasks)

Each task can be picked up separately. Area · size · suggested skill.

### A. Unified score with subscores — **market-agent** · L · analytical/ML
Danelfin-style: Fundamental / Technical / Sentiment / Risk subscores joining
signals that already exist, plus a composite score. **Hard rule**: backtest
before trusting it (infrastructure in `src/backtest`); do not ship if it is worse
than the current rubric. Start with design brainstorming + defining the
backtest success metric. *This is the flagship and needs product decisions.*

### B. Automatic Risks & Rewards — **market-agent** · M · rules/LLM
Generate risk and opportunity bullets per asset (rules over fundamentals +
optional LLM). Goes in `/asset/[ticker]`.

### C. Filters in Opportunities — **market-agent** · S/M · frontend
Filter `/opportunities` by sector / factor / score. Data is already available.

### D. Skeletons + mobile hamburger — **market-agent** · S · frontend
Bring the dashboard's UX level to market-agent (loading.tsx, header with mobile
drawer). invest-ui already has the primitives.

### E. Toasts in market-agent — **market-agent** · S · frontend
Consume `ToastProvider`/`useToast` from invest-ui (already exists) for action
feedback. Mirror of what was done in the dashboard.

### F. Portfolio analytics — **dashboard** · M · frontend/data
`src/lib/portfolio-analytics.ts`: sector/geography diversification, dividend
income projection, P&L (unrealized/realized/dividends/FX).

### G. CDTs: per-bank trend (v2) — **dashboard** · S · frontend
v1 (Sparkline of market trend by term) already exists. Extension: overlay the
user's own CDT rate vs the series, or a historical comparison table by bank.

### H. Brokers Phase 2: OAuth aggregator — **dashboard** · L · backend/integrations
SnapTrade / Plaid / Alpaca for brokers beyond IBKR. Requires an OAuth flow +
secure token storage (the Vault pattern is already established).

### I. Single domain / SSO — **infra** · M · platform
Today there are 2 domains = 2 logins (cookie per domain). Option: `app.x.com/rastreo`
and `/analisis` under one domain for seamless SSO.

### J. Tests — **both** · M · quality
The repos do not have a test runner. Set up vitest + tests for pure logic already
written (`dcf.ts`, `snowflake.ts`, `cdt-rates.ts`, `ibkr-flex` parseTrades/parsePositions).

---

## 3. How to work in parallel without stepping on each other
- **invest-ui first** when a task needs a new primitive: merge there, then run
  `pnpm update invest-ui` in the consumer. Avoids two PRs touching the same
  primitive.
- Tasks by **area** (market-agent vs dashboard vs invest-ui) do not share state →
  safe in parallel. Within one repo, avoid two PRs touching the same file
  (e.g. a section's `page.tsx`).
- One PR per feature, one commit per phase, green preview before merging.
