-- El ID de ejecución de IBKR era único en toda la tabla: si dos usuarios conectan
-- la misma cuenta de IBKR (p. ej. el dueño cambia de correo), el segundo choca con
-- "transactions_ibkr_execution_id_key". El dedup del sync ya es por cuenta
-- (syncTradesToTransactions), así que la restricción debe serlo también.

alter table public.transactions
  drop constraint if exists transactions_ibkr_execution_id_key;

alter table public.transactions
  add constraint transactions_account_ibkr_execution_key unique (account_id, ibkr_execution_id);
