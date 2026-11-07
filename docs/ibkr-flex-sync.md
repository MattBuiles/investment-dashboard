# IBKR Flex sync: v3 endpoint and retry policy

Updated: November 7, 2026.

## Symptom

The **Sincronizar** (Sync) button on the IBKR connection card (and the daily
cron) failed with:

```
1001: Statement could not be generated at this time. Please try again shortly.
```

The same Flex Query worked from the IBKR portal, and the token and query were
valid.

## Root cause

`src/lib/ibkr-flex.ts` called the legacy v2 servlet host/path:

```
https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest
https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement
```

even though it sent `v=3`. IBKR rejects that combination deterministically for
this account/query with code `1001`, which looks like a transient error but is
not.

Controlled comparison with the same token, same query, same period
(`LastBusinessDay`) and same minute:

| Endpoint | Result |
|---|---|
| `ndcdyn.../FlexWebService/SendRequest` | `Success`, ReferenceCode `8523813486` |
| `gdcdyn.../Universal/servlet/...` (the one the app used) | `Fail`, `1001` |

The only variable was the endpoint. It was not the query, the token, the period
or the weekend.

## Applied fix

Documented v3 endpoint:

```
https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService
```

- `GET /SendRequest?t=<token>&q=<queryId>&v=3`
- `GET /GetStatement?q=<referenceCode>&t=<token>&v=3`

The `<Url>` field returned by `SendRequest` is **not used**: in testing it
pointed to the legacy host (`gdcdyn`). URLs are always built from `FLEX_BASE`.

## Retries

Previously there were no retries in `SendRequest`; `GetStatement` was only
polled for code `1019`.

Now:

- `FlexError` exposes `retryable: boolean`. By default it is derived from
  `TRANSIENT_FLEX_CODES`:
  `1001`, `1004`–`1009`, `1018`, `1019`, `1021`.
- `SendRequest` retries up to 4 times (1 s, 2 s, 4 s + jitter) when IBKR returns
  `Fail` with a transient code. Non-transient codes fail immediately.
- Network errors, HTTP `429` and HTTP `5xx` are retried with exponential
  backoff. `Retry-After` is honored, capped at 5 s.
- Other HTTP `4xx` responses fail immediately.
- `GetStatement` polls up to 8 times every 1.5 s while the code is `1019`
  (statement not ready yet) and applies the same backoff to transient codes.
- If attempts are exhausted, it throws `FlexError("TIMEOUT", ..., true)`.

Retries would not have fixed the original bug: the legacy endpoint failed every
time. They handle genuinely transient `1001` responses from the v3 endpoint.

## Manual verification

`SendRequest`:

```bash
read -rsp 'Flex token: ' T; echo
curl -sS --max-time 30 -G \
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest' \
  --data-urlencode "t=$T" --data-urlencode 'q=<FLEX_QUERY_ID>' --data-urlencode 'v=3'
echo; unset T
```

`GetStatement` with the returned ReferenceCode:

```bash
read -rsp 'Flex token: ' T; echo
curl -sS --max-time 30 -G \
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement' \
  --data-urlencode "t=$T" --data-urlencode 'q=<REFERENCE_CODE>' --data-urlencode 'v=3' \
  | head -c 300
echo; unset T
```

A successful `SendRequest` responds with `Status=Success` + `ReferenceCode`.
`GetStatement` responds with `FlexQueryResponse` once the statement is ready.

## Tests

`src/lib/ibkr-flex.test.ts` covers:

- v3 endpoint URLs (`v=3`) and ignoring the legacy `<Url>`.
- Position and trade parsing.
- Retrying `1001` in `SendRequest` up to 4 attempts.
- Immediate failure on non-transient codes (`1012`).
- Polling `1019` and retrying HTTP `5xx` in `GetStatement`.
- Capping `Retry-After` and not retrying other `4xx`.
- `FlexError.retryable` on the final error.

## Operational notes

- Errors are still stored in `broker_connections.last_sync_error` in
  `<code>: <message>` format. With the v3 endpoint and retries, the `1001`
  message should no longer appear; if it does so persistently, check the query's
  generation status in the portal before changing code.
- The cron (`/api/cron/sync-ibkr`, 22:00 UTC) uses the same
  `fetchFlexStatement`, so it inherits the endpoint and retries with no
  additional changes.
- If IBKR changes hosts again, update only `FLEX_BASE` in
  `src/lib/ibkr-flex.ts`.
