"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountForm } from "./account-form";

export function AddAccountToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Add account
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-base font-medium">New account</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          CDTs and custom assets. Brokerage accounts sync from IBKR.
        </p>
        <div className="mt-4">
          <AccountForm onDone={() => setOpen(false)} />
        </div>
      </CardContent>
    </Card>
  );
}
