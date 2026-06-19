"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/lib/constants";
import { SignOutButton } from "@/components/layout/sign-out-button";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/10 bg-ink text-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-bold shadow-lg shadow-accent/30">
          TD
        </span>
        <Link href="/dashboard" className="text-lg font-semibold">
          TaDiff
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {dashboardNavItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white",
                active && "bg-white/12 text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}
