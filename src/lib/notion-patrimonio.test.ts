import { describe, expect, it } from "vitest";
import { computePatrimonio } from "./notion-patrimonio";
import type { Account, Holding } from "./portfolio";

const acc = (over: Partial<Account>): Account =>
  ({
    id: "a",
    user_id: "u",
    kind: "cdt",
    name: "x",
    currency: "COP",
    principal: 0,
    interest_rate: null,
    term_months: null,
    start_date: null,
    maturity_date: null,
    institution: null,
    ibkr_account_id: null,
    metadata: {},
    created_at: "",
    updated_at: "",
    ...over,
  }) as Account;

const fx = { base: "USD", rates: { USD: 1, COP: 4000 }, asOf: null };

describe("computePatrimonio", () => {
  it("suma IBKR en USD y en COP, y el total en COP", () => {
    const broker = acc({ id: "b", kind: "brokerage", currency: "USD" });
    const holdings = [
      { account_id: "b", quantity: 3, last_price: 200, avg_cost: 190, currency: "USD" } as Holding,
    ];
    const p = computePatrimonio([broker, acc({ kind: "custom", principal: 1_000_000 })], holdings, fx)!;
    expect(p.ibkrUsd).toBe(600);
    expect(p.ibkrCop).toBe(2_400_000);
    expect(p.otrosCop).toBe(1_000_000);
    expect(p.totalCop).toBe(3_400_000);
    expect(p.trm).toBe(4000);
  });

  it("sin tasa COP no inventa valores", () => {
    expect(computePatrimonio([], [], { base: "USD", rates: { USD: 1 }, asOf: null })).toBeNull();
  });
});
