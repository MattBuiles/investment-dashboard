-- Integration with splitstream (the owner's budget app).
--
-- splitstream writes here, with the service role from its own server, the
-- current biweekly (quincena) summary of the user whose email matches.
-- The dashboard only reads.
--
-- Security:
--   1) RLS enabled: each user can only READ their own row.
--   2) No INSERT/UPDATE/DELETE policies: only the service role writes.

create table if not exists public.ss_budget (
  user_id uuid primary key references auth.users (id) on delete cascade,
  paycheck_date date,
  paycheck_amount numeric,
  -- Available per budget bucket in COP: {"obligaciones": 352000, "inversion": ...}
  available jsonb not null default '{}'::jsonb,
  -- ETF part of Inversión accumulated during the quarter, not yet sent to IBKR.
  etf_pending numeric not null default 0,
  -- Fixed-income part accumulated during the quarter, not yet placed in a CDT/natillera.
  fixed_income_pending numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ss_budget enable row level security;

drop policy if exists "ss_budget: owner reads" on public.ss_budget;
create policy "ss_budget: owner reads" on public.ss_budget
  for select to authenticated
  using (auth.uid() = user_id);
