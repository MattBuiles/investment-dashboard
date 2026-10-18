-- Integración con splitstream (app de presupuesto del dueño).
--
-- splitstream escribe aquí, con la service role y desde su servidor, el resumen
-- de la quincena actual del usuario cuyo email coincide. El dashboard solo lee.
--
-- Seguridad:
--   1) RLS activado: cada usuario solo puede LEER su propia fila.
--   2) No hay políticas de INSERT/UPDATE/DELETE: solo la service role escribe.

create table if not exists public.ss_budget (
  user_id uuid primary key references auth.users (id) on delete cascade,
  paycheck_date date,
  paycheck_amount numeric,
  -- Disponible por bolsillo en COP: {"obligaciones": 352000, "inversion": ...}
  available jsonb not null default '{}'::jsonb,
  -- Parte ETF de Inversión acumulada en el trimestre y aún no enviada a IBKR.
  etf_pending numeric not null default 0,
  -- Parte renta fija acumulada en el trimestre y aún no puesta en CDT/natillera.
  fixed_income_pending numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ss_budget enable row level security;

drop policy if exists "ss_budget: owner reads" on public.ss_budget;
create policy "ss_budget: owner reads" on public.ss_budget
  for select to authenticated
  using (auth.uid() = user_id);
