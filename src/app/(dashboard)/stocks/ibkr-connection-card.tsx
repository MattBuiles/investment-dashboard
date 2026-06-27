"use client";

import { useState, useTransition } from "react";
import { Plug, RefreshCw, Unlink, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IbkrConnectForm } from "./ibkr-connect-form";
import { IbkrRotateForm } from "./ibkr-rotate-form";
import { disconnectIbkrFlex, syncIbkrFlex } from "./broker-connection-actions";

type Connection = {
  id: string;
  label: string;
  flex_query_id: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  token_expires_at: string | null;
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function IbkrConnectionCard({
  connection,
}: {
  connection: Connection | null;
}) {
  const [adding, setAdding] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!connection) {
    return (
      <Card>
        <CardContent className="pt-6">
          {adding ? (
            <>
              <h3 className="text-base font-semibold">Conectar IBKR (Flex)</h3>
              <div className="mt-4">
                <IbkrConnectForm onDone={() => setAdding(false)} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Sin broker conectado</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Conecta IBKR (Flex Web Service) para sincronizar posiciones automáticamente.
                </p>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plug className="size-4" />
                Conectar IBKR
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const days = daysUntil(connection.token_expires_at);
  const expired = days != null && days <= 0;
  const expiringSoon = days != null && days > 0 && days <= 30;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {(expired || expiringSoon) && (
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
              expired
                ? "border-[var(--negative)] text-[var(--negative)]"
                : "border-yellow-500/40 text-yellow-700"
            }`}
          >
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <div>
              {expired ? (
                <p>
                  Token IBKR expirado el{" "}
                  {new Date(connection.token_expires_at!).toLocaleDateString()}. Genera uno nuevo
                  y rota.
                </p>
              ) : (
                <p>
                  Token IBKR expira en {days} día{days === 1 ? "" : "s"} (
                  {new Date(connection.token_expires_at!).toLocaleDateString()}). Rótalo pronto.
                </p>
              )}
            </div>
          </div>
        )}

        {rotating ? (
          <>
            <h3 className="text-base font-semibold">Rotar token IBKR</h3>
            <IbkrRotateForm connectionId={connection.id} onDone={() => setRotating(false)} />
          </>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-[var(--positive)]" />
                <h3 className="text-base font-semibold">{connection.label}</h3>
                <span className="text-xs text-[var(--muted)]">Interactive Brokers · Flex</span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Query <span className="font-mono">{connection.flex_query_id ?? "—"}</span> · Token cifrado en Vault
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {connection.last_synced_at
                  ? `Última sync ${new Date(connection.last_synced_at).toLocaleString()} · ${connection.last_sync_status ?? ""}`
                  : "Nunca sincronizado"}
                {connection.token_expires_at && (
                  <> · expira {new Date(connection.token_expires_at).toLocaleDateString()}</>
                )}
              </p>
              {connection.last_sync_status === "error" && connection.last_sync_error && (
                <p className="mt-1 text-xs text-[var(--negative)]">{connection.last_sync_error}</p>
              )}
              {feedback && <p className="mt-2 text-xs">{feedback}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setFeedback("Sincronizando…");
                    const res = await syncIbkrFlex(connection.id);
                    setFeedback(
                      res.ok ? `Sync OK · ${res.count} posiciones` : `Error: ${res.error}`
                    );
                  })
                }
              >
                <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
              <button
                type="button"
                aria-label="Rotar token"
                onClick={() => setRotating(true)}
                className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                <KeyRound className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Desconectar IBKR"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!confirm("Desconectar IBKR? Borra las posiciones sincronizadas y el token cifrado.")) return;
                    await disconnectIbkrFlex(connection.id);
                  })
                }
                className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
              >
                <Unlink className="size-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
