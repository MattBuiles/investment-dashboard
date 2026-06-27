"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { holdingMarketValue, type Holding } from "@/lib/portfolio";
import { HoldingForm } from "./holding-form";
import { BrokerForm } from "./broker-form";
import { deleteHolding, deleteBroker } from "./actions";

type Broker = {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
};

export function BrokerSection({
  broker,
  holdings,
}: {
  broker: Broker;
  holdings: Holding[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingBroker, setEditingBroker] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);

  const total = holdings.reduce((s, h) => s + holdingMarketValue(h), 0);

  return (
    <Card>
      <CardContent className="pt-5">
        {editingBroker ? (
          <BrokerForm initial={broker} onDone={() => setEditingBroker(false)} />
        ) : (
          <header className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{broker.name}</h3>
                <span className="text-xs text-[var(--muted)]">{broker.institution}</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrency(total, broker.currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
                <Plus className="size-4" />
                {adding ? "Cerrar" : "Stock"}
              </Button>
              <button
                type="button"
                aria-label={`Editar ${broker.name}`}
                onClick={() => setEditingBroker(true)}
                className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Eliminar ${broker.name}`}
                onClick={async () => {
                  if (holdings.length > 0) {
                    if (!confirm(`${broker.name} tiene ${holdings.length} posiciones. Eliminar todo?`)) return;
                  } else if (!confirm(`Eliminar ${broker.name}?`)) return;
                  await deleteBroker(broker.id);
                }}
                className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </header>
        )}

        {adding && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <HoldingForm
              accountId={broker.id}
              defaultCurrency={broker.currency}
              onDone={() => setAdding(false)}
            />
          </div>
        )}

        {holdings.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {holdings.map((h) => {
              if (editingHoldingId === h.id) {
                return (
                  <li key={h.id} className="py-3">
                    <HoldingForm
                      accountId={broker.id}
                      defaultCurrency={broker.currency}
                      initial={{
                        id: h.id,
                        symbol: h.symbol,
                        quantity: h.quantity,
                        avg_cost: h.avg_cost,
                        currency: h.currency,
                      }}
                      onDone={() => setEditingHoldingId(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={h.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{h.symbol}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {Number(h.quantity).toLocaleString()} @ {formatCurrency(Number(h.avg_cost), h.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(holdingMarketValue(h), h.currency)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{h.currency}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Editar ${h.symbol}`}
                    onClick={() => setEditingHoldingId(h.id)}
                    className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${h.symbol}`}
                    onClick={async () => {
                      if (!confirm(`Eliminar ${h.symbol}?`)) return;
                      await deleteHolding(h.id);
                    }}
                    className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
