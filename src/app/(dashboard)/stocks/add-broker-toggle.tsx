"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrokerForm } from "./broker-form";

export function AddBrokerToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Agregar broker
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-base font-medium">Nuevo broker</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Una cuenta por broker. Después agrega posiciones dentro.
        </p>
        <div className="mt-4">
          <BrokerForm onDone={() => setOpen(false)} />
        </div>
      </CardContent>
    </Card>
  );
}
