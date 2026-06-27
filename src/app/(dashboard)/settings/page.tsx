import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("ibkr_connection_status")
    .select("connected_at, session_active")
    .maybeSingle();

  const isConnected = Boolean(connection?.connected_at);
  const sessionLive = Boolean(connection?.session_active);

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your profile and connected brokerages.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-base font-medium">Account</h2>
          <p className="text-sm text-[var(--muted)]">{user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-medium">Interactive Brokers</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Connect via OAuth (Third Party). Once connected, positions sync
                automatically.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {isConnected ? (
                <>
                  <CheckCircle2 className="size-4 text-[var(--positive)]" />
                  <span className="text-[var(--positive)]">
                    {sessionLive ? "Live session" : "Connected"}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="size-4 text-[var(--muted)]" />
                  <span className="text-[var(--muted)]">Not connected</span>
                </>
              )}
            </div>
          </div>

          {isConnected ? (
            <Button variant="secondary" size="sm" disabled>
              Manage connection (coming soon)
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              Connect IBKR (coming soon)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
