import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, connectionRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("base_currency, display_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("broker_connections")
      .select("id, label, last_synced_at, last_sync_status")
      .eq("broker_kind", "ibkr_flex")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data ?? { base_currency: "USD", display_name: null };
  const connection = connectionRes.data;
  const isConnected = Boolean(connection?.id);

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
          <h2 className="text-base font-medium">Perfil</h2>
          <ProfileForm initial={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-medium">Interactive Brokers (Flex)</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Token cifrado via Supabase Vault. Sync read-only de posiciones.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {isConnected ? (
                <>
                  <CheckCircle2 className="size-4 text-[var(--positive)]" />
                  <span className="text-[var(--positive)]">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="size-4 text-[var(--muted)]" />
                  <span className="text-[var(--muted)]">Not connected</span>
                </>
              )}
            </div>
          </div>

          {isConnected && connection && (
            <p className="text-xs text-[var(--muted)]">
              {connection.label} ·{" "}
              {connection.last_synced_at
                ? `última sync ${new Date(connection.last_synced_at).toLocaleString()}`
                : "nunca sincronizado"}
            </p>
          )}

          <Link
            href="/stocks"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {isConnected ? "Manage in Stocks" : "Connect IBKR in Stocks"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
