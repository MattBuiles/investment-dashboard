"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CdtForm } from "./cdt-form";

export function AddCdtToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Agregar CDT
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-base font-medium">Nuevo CDT</h2>
        <div className="mt-4">
          <CdtForm onDone={() => setOpen(false)} />
        </div>
      </CardContent>
    </Card>
  );
}
