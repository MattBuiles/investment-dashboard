# Reporte de sesión & handoff — Agosto 2026

Ecosistema de inversión: **investment-dashboard** (Rastreo: qué tengo, cómo va) +
**market-agent** (Análisis: qué es bueno, cuándo comprar), dos repos separados
integrados por Supabase compartido y un design system común (**invest-ui**).

---

## 1. Qué se hizo

### Rework UI/UX (Fases 1–4) — completo, en prod
- **invest-ui** (`MattBuiles/invest-ui`, público, consumido como git-dependency
  sin build): tokens claro+oscuro, primitivos (Button, Card, Badge, Field, Tabs,
  Table, Skeleton, EmptyState, ThemeToggle), charts (ScoreGauge, Snowflake) y
  ThemeProvider.
- **market-agent**: PriceChart (velas + EMAs + zonas S/R), Snowflake 5 ejes, DCF /
  valor intrínseco, `ma_signals` enriquecido (ejes + fair value), modo claro.
- **dashboard**: adopta invest-ui (jade, claro/oscuro), Portfolio Snowflake en el
  overview, nav móvil con drawer, skeletons, badges de vencimiento de CDT, URLs
  cross-app apuntando a prod (no localhost).

### Esta sesión
| PR | Repo | Entrega |
|----|------|---------|
| #9 (previo) | dashboard | Sync IBKR programado (cron diario + Vault desde service_role) |
| **#11** | dashboard | **Fix**: el proxy de sesión redirigía `/api/cron` a login → el cron era un no-op. Exento. |
| **#10** | dashboard | CDTs enriquecidos: buckets 90/180/360, prefill de tasa por banco, comparación tu-CDT-vs-mercado, Tabs por plazo |
| **#1** | invest-ui | Modal + ConfirmProvider/useConfirm |
| **#12** | dashboard | ConfirmDialog reemplaza los 6 `window.confirm()` |
| **#13** | dashboard | IBKR multi-conexión |
| **#14** | dashboard | IBKR historial de transacciones (parseo de sección Trades → tabla `transactions`) |
| **#2** | invest-ui | Toast/ToastProvider/useToast + Sparkline |
| **#15** | dashboard | Toasts de éxito (guardar/borrar/sync) + tendencia histórica de tasa CDT (Sparkline) |

### Arquitectura / seguridad relevante
- **Cerebro único**: market-agent computa score/snowflake/fair value → `ma_signals`;
  el dashboard solo los muestra. Tablas compartidas prefijadas `ma_*`.
- **Sync IBKR programado**: cron Vercel (22:00 UTC) → `/api/cron/sync-ibkr`
  (fail-closed por `CRON_SECRET`) → cliente service-role → RPC
  `get_broker_secret_service` (SECURITY DEFINER, ejecutable **solo** por
  service_role, auditada) descifra el token Flex de Vault → upsert de holdings +
  transactions por conexión. Verificado en prod: sin auth → 401.
- invest-ui se fija por **commit** en `pnpm-lock`; tras mergear en invest-ui hay que
  correr `pnpm update invest-ui` en el consumidor para bumpear.

### Pendientes de acción del usuario (no código)
- IBKR: añadir sección **Trades** al Flex Query (hoy solo Open Positions) y correr
  un sync → puebla `transactions`.
- Confirmar el sync programado end-to-end con el `CRON_SECRET` real (o esperar la
  corrida de las 22:00 UTC). Nota: `CRON_SECRET` debe ser ASCII puro (va en header).

---

## 2. Backlog para compañeros (tareas independientes)

Cada tarea es tomable por separado. Área · tamaño · skill sugerido.

### A. Score unificado con subscores — **market-agent** · L · analítico/ML
Estilo Danelfin: subscores Fundamental / Técnico / Sentimiento / Riesgo uniendo
señales que ya existen, más un score compuesto. **Regla dura**: backtestear antes
de confiar (infra en `src/backtest`); no shippear si empeora vs la rúbrica actual.
Empezar por brainstorming de diseño + definición de la métrica de éxito del
backtest. *Este es el flagship y necesita decisiones de producto.*

### B. Risks & Rewards automáticos — **market-agent** · M · reglas/LLM
Generar viñetas de riesgos y oportunidades por activo (reglas sobre fundamentales +
opcional LLM). Va en `/asset/[ticker]`.

### C. Filtros en Oportunidades — **market-agent** · S/M · frontend
Filtrar `/opportunities` por sector / factor / score. Datos ya disponibles.

### D. Skeletons + hamburguesa móvil — **market-agent** · S · frontend
Traer al market-agent el mismo nivel de UX del dashboard (loading.tsx, header con
drawer móvil). invest-ui ya tiene los primitivos.

### E. Toasts en market-agent — **market-agent** · S · frontend
Consumir `ToastProvider`/`useToast` de invest-ui (ya existe) para feedback de
acciones. Espejo de lo hecho en el dashboard.

### F. Analytics de cartera — **dashboard** · M · frontend/datos
`src/lib/portfolio-analytics.ts`: diversificación por sector/geografía, proyección
de ingresos por dividendos, P&L (no realizado/realizado/dividendos/FX).

### G. CDTs: tendencia por banco (v2) — **dashboard** · S · frontend
La v1 (Sparkline de tendencia de mercado por plazo) ya está. Extensión: overlay de
la tasa del propio CDT vs la serie, o tabla comparativa histórica por banco.

### H. Brokers Fase 2: agregador OAuth — **dashboard** · L · backend/integraciones
SnapTrade / Plaid / Alpaca para brokers más allá de IBKR. Requiere flujo OAuth +
almacenamiento seguro de tokens (patrón Vault ya establecido).

### I. Dominio único / SSO — **infra** · M · plataforma
Hoy son 2 dominios = 2 logins (cookie por dominio). Opción: `app.x.com/rastreo` y
`/analisis` bajo un dominio para SSO fluido.

### J. Tests — **ambos** · M · calidad
Los repos no tienen runner de tests. Montar vitest + tests de lógica pura ya escrita
(`dcf.ts`, `snowflake.ts`, `cdt-rates.ts`, `ibkr-flex` parseTrades/parsePositions).

---

## 3. Cómo trabajar en paralelo sin pisarse
- **invest-ui primero** cuando una tarea necesita un primitivo nuevo: mergear ahí,
  luego `pnpm update invest-ui` en el consumidor. Evita que dos PRs toquen el mismo
  primitivo.
- Tareas por **área** (market-agent vs dashboard vs invest-ui) no comparten estado →
  seguras en paralelo. Dentro de un repo, evitar dos PRs que toquen el mismo archivo
  (ej. `page.tsx` de una sección).
- Un PR por feature, commit por fase, preview verde antes de mergear.
