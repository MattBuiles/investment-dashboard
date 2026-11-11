-- Retires the duplicate pg_cron job `daily_ibkr_sync` (06:00 UTC).
--
-- That job called the Edge Function `sync-brokers`, a copy of the sync logic that
-- lived only in Supabase (not in this repo) and still used the legacy Flex
-- endpoint, so it kept failing with "1001: Statement could not be generated".
-- The same sync now runs from Vercel Cron (see vercel.json: 22:00 and 06:00 UTC)
-- through /api/cron/sync-ibkr, which uses the maintained code in src/lib.
--
-- Apply this ONLY AFTER the Vercel deployment with the 06:00 UTC schedule is live,
-- so there is never a day without a sync. The Edge Function `sync-brokers` can be
-- deleted from the Supabase dashboard afterwards.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron')
     and exists (select 1 from cron.job where jobname = 'daily_ibkr_sync') then
    perform cron.unschedule('daily_ibkr_sync');
  end if;
end;
$$;
