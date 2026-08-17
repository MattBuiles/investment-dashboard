import { describe, expect, it } from "vitest";
import type { Holding } from "./portfolio";
import { holdingCost, holdingPnl, holdingsPnl } from "./portfolio";

function h(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "h",
    user_id: "u",
    account_id: "a",
    symbol: "AAPL",
    quantity: 10,
    avg_cost: 100,
    last_price: 150,
    last_price_at: null,
    currency: "USD",
    asset_class: null,
    ibkr_contract_id: null,
    updated_at: "",
    ...overrides,
  } as Holding;
}

describe("holding P&L", () => {
  it("cost = quantity × avg_cost", () => {
    expect(holdingCost(h())).toBe(1000);
  });

  it("computes gain and %", () => {
    const p = holdingPnl(h()); // value 1500, cost 1000
    expect(p.value).toBe(1500);
    expect(p.gain).toBe(500);
    expect(p.gainPct).toBeCloseTo(0.5, 5);
  });

  it("falls back to avg_cost when no last_price (gain 0)", () => {
    const p = holdingPnl(h({ last_price: null }));
    expect(p.value).toBe(1000);
    expect(p.gain).toBe(0);
    expect(p.gainPct).toBe(0);
  });

  it("aggregates across holdings", () => {
    const p = holdingsPnl([
      h(), // cost 1000, value 1500
      h({ avg_cost: 50, last_price: 40, quantity: 10 }), // cost 500, value 400
    ]);
    expect(p.cost).toBe(1500);
    expect(p.value).toBe(1900);
    expect(p.gain).toBe(400);
  });
});
