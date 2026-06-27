import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use your account to access the dashboard.
          </p>

          <form className="mt-8 space-y-4" action="#">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted)]">
            <div className="h-px flex-1 bg-[var(--border)]" />
            or
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Button variant="secondary" className="w-full" size="lg">
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Auth wiring pending — placeholder UI only.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
