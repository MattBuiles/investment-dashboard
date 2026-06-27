import { Card, CardContent } from "@/components/ui/card";

export default function AccountsPage() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          CDTs and custom assets you track manually.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-[var(--muted)]">
            No accounts yet. CDT and custom asset forms pending.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
