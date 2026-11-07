-- Recuperado de la base el 2026-11-07 (cron.job, jobid 1). Estaba solo en Supabase.
-- Corre todos los días a las 06:00 UTC y llama a la Edge Function `sync-brokers`
-- (supabase/functions/sync-brokers). Requiere pg_cron y pg_net.
--
-- El valor real de x-cron-secret es el CRON_SECRET de la función; no se versiona.
-- Sustituye <CRON_SECRET> al aplicar este archivo a mano.

select cron.schedule(
  'daily_ibkr_sync',
  '0 6 * * *',
  $job$
  select net.http_post(
    url := 'https://pxgmqohrvjlodgvdccym.supabase.co/functions/v1/sync-brokers',
    headers := jsonb_build_object(
      'x-cron-secret', '<CRON_SECRET>'
      -- el trabajo original puede llevar más cabeceras (p. ej. Content-Type): ver cron.job
    )
  );
  $job$
);

-- Función que lee el token del broker desde Vault y deja registro en
-- broker_secret_access_log (la usa la Edge Function vía rpc).
CREATE OR REPLACE FUNCTION public.cron_get_broker_secret(p_connection_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.broker_connections%rowtype;
  v_secret text;
begin
  select * into v_row from public.broker_connections where id = p_connection_id;
  if not found then return null; end if;

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where id = v_row.vault_secret_id;

  insert into public.broker_secret_access_log (user_id, connection_id, action, source)
    values (v_row.user_id, p_connection_id, 'read', 'cron_get_broker_secret');

  return v_secret;
end;
$function$;

-- Permisos reales en producción (verificados el 2026-11-07): solo postgres y
-- service_role ejecutan esta función. Sin estas líneas, un CREATE OR REPLACE
-- nuevo la deja con el EXECUTE por defecto para PUBLIC y cualquier usuario
-- autenticado podría pedir el token de un broker por su connection_id.
REVOKE EXECUTE ON FUNCTION public.cron_get_broker_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_get_broker_secret(uuid) TO service_role;
