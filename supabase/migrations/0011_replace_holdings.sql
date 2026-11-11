-- Atomic replacement of an account's holdings.
--
-- The IBKR syncs used to `delete` the account's holdings and then `insert` the
-- new ones as two separate requests: if the insert failed (or the process died
-- in between), the account was left empty until the next successful sync.
-- This function does both in ONE transaction, so a failure rolls everything
-- back and the previous holdings stay intact.
--
-- SECURITY INVOKER on purpose: the manual sync calls it with the user's session
-- (RLS keeps them to their own rows) and the cron calls it with the service
-- role. Apply this migration BEFORE deploying the code that calls it.

create or replace function public.replace_holdings(p_account_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.holdings where account_id = p_account_id;

  insert into public.holdings (
    user_id, account_id, symbol, asset_class, quantity, avg_cost,
    currency, last_price, last_price_at, ibkr_contract_id
  )
  select
    r.user_id, r.account_id, r.symbol, r.asset_class, r.quantity, r.avg_cost,
    r.currency, r.last_price, r.last_price_at, r.ibkr_contract_id
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
    user_id uuid, account_id uuid, symbol text, asset_class text,
    quantity numeric, avg_cost numeric, currency text,
    last_price numeric, last_price_at timestamptz, ibkr_contract_id text
  );
end;
$$;

revoke execute on function public.replace_holdings(uuid, jsonb) from public, anon;
grant execute on function public.replace_holdings(uuid, jsonb) to authenticated, service_role;
