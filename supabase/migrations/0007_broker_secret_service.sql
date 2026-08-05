-- Fase 4 — IBKR scheduled sync.
--
-- Scheduled syncs run from a cron with the service-role key and NO user session,
-- so they cannot use get_broker_secret() (which enforces auth.uid() = owner).
-- REST (PostgREST) only exposes the `public` schema, so the service role also
-- cannot select vault.decrypted_secrets directly. This SECURITY DEFINER function
-- in `public` is the only bridge: it reads Vault and returns the decrypted Flex
-- token. It is locked down so ONLY the service_role can call it.
--
-- Defense in depth:
--   1) EXECUTE revoked from public/anon/authenticated, granted ONLY to service_role.
--   2) Runtime guard rejects any caller whose JWT role is not service_role.
--   3) Every read is written to broker_secret_access_log (source = 'cron').

create or replace function public.get_broker_secret_service(p_connection_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_user_id uuid;
  v_token text;
begin
  -- Fail closed: only the service role (scheduled sync) may call this.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden: service_role only';
  end if;

  select vault_secret_id, user_id
    into v_secret_id, v_user_id
  from public.broker_connections
  where id = p_connection_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret
    into v_token
  from vault.decrypted_secrets
  where id = v_secret_id;

  insert into public.broker_secret_access_log (user_id, connection_id, action, source)
  values (v_user_id, p_connection_id, 'read', 'cron');

  return v_token;
end;
$$;

revoke all on function public.get_broker_secret_service(uuid) from public;
revoke all on function public.get_broker_secret_service(uuid) from anon;
revoke all on function public.get_broker_secret_service(uuid) from authenticated;
grant execute on function public.get_broker_secret_service(uuid) to service_role;
