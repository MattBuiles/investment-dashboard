import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Investment Dashboard
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--muted)]">
          Track CDTs, IBKR holdings, and custom investments in one place.
          Connect Interactive Brokers via OAuth and watch your portfolio in
          real time.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/login">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/overview">
            <Button size="lg" variant="secondary">
              Demo dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
