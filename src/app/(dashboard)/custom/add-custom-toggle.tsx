"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomForm } from "./custom-form";

export function AddCustomToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Agregar activo
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-base font-medium">Nuevo activo</h2>
        <div className="mt-4">
          <CustomForm onDone={() => setOpen(false)} />
        </div>
      </CardContent>
    </Card>
  );
}
