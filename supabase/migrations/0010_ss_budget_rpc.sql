-- splitstream escribe su resumen sin la service role: llama a esta función con un
-- token propio. La función solo puede hacer upsert de UNA fila: la del dueño
-- configurado en ss_config. Un token filtrado no da acceso a nada más.

create table if not exists public.ss_config (
  id int primary key default 1 check (id = 1),
  owner_email text not null,
  token_hash text not null -- sha256 en hex del token de splitstream
);
alter table public.ss_config enable row level security; -- sin políticas: nadie la lee por la API
revoke all on public.ss_config from anon, authenticated;

create or replace function public.ss_upsert_budget(p_token text, p_row jsonb)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg public.ss_config;
  uid uuid;
begin
  select * into cfg from public.ss_config where id = 1;
  if cfg is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> cfg.token_hash then
    raise exception 'forbidden';
  end if;

  select id into uid from auth.users where lower(email) = lower(cfg.owner_email);
  if uid is null then
    return 'owner-not-found';
  end if;

  insert into public.ss_budget as b
    (user_id, paycheck_date, paycheck_amount, available, etf_pending, fixed_income_pending, updated_at)
  values (
    uid,
    (p_row ->> 'paycheck_date')::date,
    (p_row ->> 'paycheck_amount')::numeric,
    coalesce(p_row -> 'available', '{}'::jsonb),
    coalesce((p_row ->> 'etf_pending')::numeric, 0),
    coalesce((p_row ->> 'fixed_income_pending')::numeric, 0),
    now()
  )
  on conflict (user_id) do update set
    paycheck_date = excluded.paycheck_date,
    paycheck_amount = excluded.paycheck_amount,
    available = excluded.available,
    etf_pending = excluded.etf_pending,
    fixed_income_pending = excluded.fixed_income_pending,
    updated_at = excluded.updated_at;

  return 'ok';
end;
$$;

revoke all on function public.ss_upsert_budget(text, jsonb) from public;
grant execute on function public.ss_upsert_budget(text, jsonb) to anon, authenticated;
