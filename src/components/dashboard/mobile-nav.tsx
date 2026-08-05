"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  LineChart,
  Sparkles,
  Menu,
  Settings,
  LogOut,
  Compass,
  X,
} from "lucide-react";
import { ThemeToggle } from "invest-ui";
import { cn } from "@/lib/utils";
import { marketAgentUrl } from "@/lib/agent-signals";
import { signOut } from "@/app/(auth)/login/actions";

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/cdts", label: "CDTs", icon: Landmark },
  { href: "/stocks", label: "Stocks", icon: LineChart },
  { href: "/custom", label: "Custom", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Más</span>
              <button aria-label="Cerrar" onClick={() => setOpen(false)}>
                <X className="size-5 text-[var(--muted)]" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
              >
                <Settings className="size-4" /> Settings
              </Link>
              <a
                href={marketAgentUrl("/")}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
              >
                <Compass className="size-4" /> Análisis ↗
              </a>
              <div className="px-1 py-1">
                <ThemeToggle />
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                >
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
        <ul className="grid grid-cols-5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-xs",
                    active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-xs text-[var(--muted)]"
            >
              <Menu className="size-5" />
              Más
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
