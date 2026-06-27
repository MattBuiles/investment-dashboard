import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your profile and connected brokerages.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="text-base font-medium">Interactive Brokers</h2>
          <p className="text-sm text-[var(--muted)]">
            Connect via OAuth (Third Party). Requires consumer key + RSA
            signing key configured in environment.
          </p>
          <Button variant="secondary" size="sm" disabled>
            Connect IBKR (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
