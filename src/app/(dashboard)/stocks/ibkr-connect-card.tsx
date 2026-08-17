"use client";

import { useState } from "react";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IbkrConnectForm } from "./ibkr-connect-form";

// Afiche para conectar una cuenta IBKR (Flex). `additional` cambia el texto
// cuando ya existe al menos una conexión (multi-conexión).
export function IbkrConnectCard({ additional = false }: { additional?: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardContent className="pt-6">
        {adding ? (
          <>
            <h3 className="text-base font-semibold">
              {additional ? "Conectar otra cuenta IBKR" : "Conectar IBKR (Flex)"}
            </h3>
            <div className="mt-4">
              <IbkrConnectForm onDone={() => setAdding(false)} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">
                {additional ? "¿Otra cuenta IBKR?" : "Sin broker conectado"}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {additional
                  ? "Conecta una cuenta IBKR adicional (otro Flex Query)."
                  : "Conecta IBKR (Flex Web Service) para sincronizar posiciones y transacciones automáticamente."}
              </p>
            </div>
            <Button size="sm" variant={additional ? "secondary" : "primary"} onClick={() => setAdding(true)}>
              <Plug className="size-4" />
              {additional ? "Conectar otra" : "Conectar IBKR"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
