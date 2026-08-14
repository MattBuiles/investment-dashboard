"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  LineChart,
  Sparkles,
  Settings,
  TrendingUp,
  Compass,
} from "lucide-react";
import { ThemeToggle } from "strata";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";
import { FeedbackButton } from "@/components/feedback/feedback-button";

// market-agent (app hermana de análisis/decisión). URL por env, con fallback.
const MARKET_AGENT_URL =
  process.env.NEXT_PUBLIC_MARKET_AGENT_URL ??
  "https://market-agent-orcin.vercel.app/opportunities";

function marketAgentOrigin(): string {
  try {
    return new URL(MARKET_AGENT_URL).origin;
  } catch {
    return "http://localhost:3001";
  }
}

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/cdts", label: "CDTs", icon: Landmark },
  { href: "/stocks", label: "Stocks", icon: LineChart },
  { href: "/custom", label: "Custom", icon: Sparkles },
  {
    href: MARKET_AGENT_URL,
    label: "Oportunidades",
    icon: Compass,
    external: true,
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6">
      <Link href="/overview" className="flex items-center gap-2 px-3 mb-4">
        <TrendingUp className="size-5 text-[var(--accent)]" />
        <span className="font-semibold tracking-tight">Investments</span>
      </Link>

      {/* Switcher entre las dos apps hermanas */}
      <div className="mb-6 flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
        <span className="flex-1 rounded-md bg-[var(--surface)] px-2 py-1.5 text-center font-medium">
          Rastreo
        </span>
        <a
          href={`${marketAgentOrigin()}/`}
          className="flex-1 px-2 py-1.5 text-center text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Análisis ↗
        </a>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ href, label, icon: Icon, external }) => {
          const active = !external && pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        {userEmail && (
          <p className="px-3 pb-2 text-xs text-[var(--muted)] truncate">
            {userEmail}
          </p>
        )}
        <div className="mb-2 px-1">
          <ThemeToggle />
        </div>
        <FeedbackButton variant="sidebar" />
        <SignOutButton />
      </div>
    </aside>
  );
}
