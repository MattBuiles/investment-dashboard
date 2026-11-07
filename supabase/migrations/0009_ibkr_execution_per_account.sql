-- The IBKR execution ID was unique across the whole table: if two users connect
-- the same IBKR account (e.g. the owner changes email), the second one hits
-- "transactions_ibkr_execution_id_key". Sync dedup is already per account
-- (syncTradesToTransactions), so the constraint has to be as well.

alter table public.transactions
  drop constraint if exists transactions_ibkr_execution_id_key;

alter table public.transactions
  add constraint transactions_account_ibkr_execution_key unique (account_id, ibkr_execution_id);
