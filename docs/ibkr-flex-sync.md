# Sync IBKR Flex: endpoint v3 y política de reintentos

Actualizado: 7 de noviembre de 2026.

## Síntoma

El botón **Sincronizar** de la tarjeta de conexión IBKR (y el cron diario)
fallaba con:

```
1001: Statement could not be generated at this time. Please try again shortly.
```

El mismo Flex Query funcionaba desde el portal de IBKR, y el token y la query
eran válidos.

## Causa raíz

`src/lib/ibkr-flex.ts` llamaba al host/path legado del servlet v2:

```
https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest
https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement
```

aunque enviaba `v=3`. IBKR rechaza esa combinación de forma determinista para
esta cuenta/query con el código `1001`, que simula ser un error transitorio pero
no lo es.

Comparación controlada, mismo token, misma query, mismo periodo
(`LastBusinessDay`) y mismo minuto:

| Endpoint | Resultado |
|---|---|
| `ndcdyn.../FlexWebService/SendRequest` | `Success`, ReferenceCode `8523813486` |
| `gdcdyn.../Universal/servlet/...` (el que usaba la app) | `Fail`, `1001` |

El único cambio fue el endpoint. No era la query, ni el token, ni el periodo, ni
el fin de semana.

## Solución aplicada

Endpoint v3 documentado:

```
https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService
```

- `GET /SendRequest?t=<token>&q=<queryId>&v=3`
- `GET /GetStatement?q=<referenceCode>&t=<token>&v=3`

El campo `<Url>` que devuelve `SendRequest` **no se usa**: en las pruebas
apuntaba al host legado (`gdcdyn`). Las URLs se construyen siempre desde
`FLEX_BASE`.

## Reintentos

Antes no había reintentos en `SendRequest`; solo se sondeaba `GetStatement` para
el código `1019`.

Ahora:

- `FlexError` expone `retryable: boolean`. Por defecto se deriva de
  `TRANSIENT_FLEX_CODES`:
  `1001`, `1004`–`1009`, `1018`, `1019`, `1021`.
- `SendRequest` reintenta hasta 4 veces (1 s, 2 s, 4 s + jitter) cuando IBKR
  devuelve `Fail` con un código transitorio. Los códigos no transitorios fallan
  de inmediato.
- Errores de red, HTTP `429` y HTTP `5xx` se reintentan con backoff
  exponencial. Se respeta `Retry-After`, con tope de 5 s.
- El resto de HTTP `4xx` falla de inmediato.
- `GetStatement` sondea hasta 8 veces cada 1.5 s mientras el código sea `1019`
  (statement aún no listo) y aplica el mismo backoff a códigos transitorios.
- Si se agotan los intentos, se lanza `FlexError("TIMEOUT", ..., true)`.

Los reintentos no habrían resuelto el bug original: el endpoint legado fallaba
siempre. Sirven para los `1001` realmente transitorios del endpoint v3.

## Verificación manual

`SendRequest`:

```bash
read -rsp 'Flex token: ' T; echo
curl -sS --max-time 30 -G \
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest' \
  --data-urlencode "t=$T" --data-urlencode 'q=<FLEX_QUERY_ID>' --data-urlencode 'v=3'
echo; unset T
```

`GetStatement` con el ReferenceCode devuelto:

```bash
read -rsp 'Flex token: ' T; echo
curl -sS --max-time 30 -G \
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement' \
  --data-urlencode "t=$T" --data-urlencode 'q=<REFERENCE_CODE>' --data-urlencode 'v=3' \
  | head -c 300
echo; unset T
```

Un `SendRequest` correcto responde `Status=Success` + `ReferenceCode`.
`GetStatement` responde `FlexQueryResponse` cuando el statement está listo.

## Tests

`src/lib/ibkr-flex.test.ts` cubre:

- URLs del endpoint v3 (`v=3`) y que se ignora el `<Url>` legado.
- Parseo de posiciones y trades.
- Reintento de `1001` en `SendRequest` hasta 4 intentos.
- Fallo inmediato en códigos no transitorios (`1012`).
- Sondeo de `1019` y reintento de HTTP `5xx` en `GetStatement`.
- Tope de `Retry-After` y no reintento de otros `4xx`.
- `FlexError.retryable` en el error final.

## Notas operativas

- Los errores se siguen guardando en `broker_connections.last_sync_error` con el
  formato `<code>: <message>`. Con el endpoint v3 y los reintentos, el mensaje
  `1001` ya no debería aparecer; si reaparece de forma sostenida, revisar el
  estado de generación del query en el portal antes de tocar el código.
- El cron (`/api/cron/sync-ibkr`, 22:00 UTC) usa el mismo
  `fetchFlexStatement`, por lo que hereda endpoint y reintentos sin cambios
  adicionales.
- Si IBKR vuelve a cambiar de host, actualizar solo `FLEX_BASE` en
  `src/lib/ibkr-flex.ts`.
