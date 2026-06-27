import { Card, CardContent } from "@/components/ui/card";

export default function HoldingsPage() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Holdings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Positions synced from Interactive Brokers.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-[var(--muted)]">
            IBKR sync pending. Connect your account in Settings to populate
            this view.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
