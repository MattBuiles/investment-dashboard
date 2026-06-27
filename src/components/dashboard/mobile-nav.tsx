"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Landmark, LineChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/cdts", label: "CDTs", icon: Landmark },
  { href: "/stocks", label: "Stocks", icon: LineChart },
  { href: "/custom", label: "Custom", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
      <ul className="grid grid-cols-4">
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
      </ul>
    </nav>
  );
}
