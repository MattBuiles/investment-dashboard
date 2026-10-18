import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchFxRates, type FxRates } from "@/lib/fx";
import {
  accountValueIn,
  accountValueInAccrued,
  type Account,
  type Holding,
} from "@/lib/portfolio";
import { isBudgetOwner } from "@/lib/splitstream";

// Solo para el dueño (OWNER_EMAIL): escribe su patrimonio en SU Notion.
// Ningún otro usuario del dashboard se sincroniza.
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

export interface Patrimonio {
  cdtCop: number;
  ibkrUsd: number;
  ibkrCop: number;
  otrosCop: number;
  totalCop: number;
  trm: number;
}

/** Valor del patrimonio en COP (CDTs con intereses causados). null si no hay tasa COP. */
export function computePatrimonio(
  accounts: Account[],
  holdings: Holding[],
  fx: FxRates
): Patrimonio | null {
  const trm = fx.rates.COP;
  // Sin tasa COP, convertAmount devolvería el monto sin convertir: mejor no escribir nada.
  if (!trm) return null;
  const sum = (kind: Account["kind"], fn: (a: Account) => number) =>
    accounts.filter((a) => a.kind === kind).reduce((s, a) => s + fn(a), 0);

  const cdtCop = sum("cdt", (a) => accountValueInAccrued(a, holdings, "COP", fx));
  const ibkrUsd = sum("brokerage", (a) => accountValueIn(a, holdings, "USD", fx));
  const ibkrCop = sum("brokerage", (a) => accountValueIn(a, holdings, "COP", fx));
  const otrosCop = sum("custom", (a) => accountValueInAccrued(a, holdings, "COP", fx));
  return { cdtCop, ibkrUsd, ibkrCop, otrosCop, totalCop: cdtCop + ibkrCop + otrosCop, trm };
}

async function notion<T>(path: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

type QueryResult = { results: { id: string }[] };

const query = (dataSourceId: string, filter: unknown) =>
  notion<QueryResult>(`/data_sources/${dataSourceId}/query`, "POST", { filter, page_size: 10 });

/** Fila del mes ("2026-10"): se crea el primer día y se sobrescribe a diario hasta que cierra el mes. */
async function upsertMonth(dataSourceId: string, p: Patrimonio, today: string) {
  const month = today.slice(0, 7);
  const props = {
    Mes: { title: [{ text: { content: month } }] },
    Fecha: { date: { start: today } },
    CDTs: { number: Math.round(p.cdtCop) },
    "IBKR USD": { number: Math.round(p.ibkrUsd * 100) / 100 },
    IBKR: { number: Math.round(p.ibkrCop) },
    Otros: { number: Math.round(p.otrosCop) },
    Total: { number: Math.round(p.totalCop) },
    TRM: { number: Math.round(p.trm * 100) / 100 },
  };
  const [existing, ...dupes] = (await query(dataSourceId, { property: "Mes", title: { equals: month } })).results;
  for (const d of dupes) await notion(`/pages/${d.id}`, "PATCH", { in_trash: true });
  if (existing) await notion(`/pages/${existing.id}`, "PATCH", { properties: props });
  else await notion("/pages", "POST", { parent: { type: "data_source_id", data_source_id: dataSourceId }, properties: props });
}

/** Actualiza el Saldo (COP) de las filas "IBKR" y "CDTs" de la base Inversiones. */
async function updateSaldo(dataSourceId: string, name: string, value: number) {
  const [row] = (await query(dataSourceId, { property: "Name", title: { equals: name } })).results;
  if (row) await notion(`/pages/${row.id}`, "PATCH", { properties: { Saldo: { number: Math.round(value) } } });
}

export async function syncOwnerPatrimonio(admin: SupabaseClient<Database>): Promise<string> {
  const { OWNER_EMAIL, NOTION_TOKEN, NOTION_PATRIMONIO_DS, NOTION_INVERSIONES_DS } = process.env;
  if (!OWNER_EMAIL || !NOTION_TOKEN || !NOTION_PATRIMONIO_DS || !NOTION_INVERSIONES_DS) return "off";

  const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const owner = users.users.find((u) => isBudgetOwner(u.email));
  if (!owner) return "owner-not-found";

  const [accountsRes, holdingsRes, fx] = await Promise.all([
    admin.from("accounts").select("*").eq("user_id", owner.id),
    admin.from("holdings").select("*").eq("user_id", owner.id),
    fetchFxRates(),
  ]);
  const p = computePatrimonio(accountsRes.data ?? [], holdingsRes.data ?? [], fx);
  if (!p) return "no-fx";

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  await upsertMonth(NOTION_PATRIMONIO_DS, p, today);
  await updateSaldo(NOTION_INVERSIONES_DS, "IBKR", p.ibkrCop);
  await updateSaldo(NOTION_INVERSIONES_DS, "CDTs", p.cdtCop);
  return "ok";
}
