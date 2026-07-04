"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/lib/constants";
import { SignOutButton } from "@/components/layout/sign-out-button";

const navGroups = dashboardNavItems.reduce<Record<string, typeof dashboardNavItems>>((groups, item) => {
  groups[item.group] = [...(groups[item.group] ?? []), item];
  return groups;
}, {});

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-ink text-white shadow-xl shadow-ink/10 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-bold shadow-sm shadow-accent/30">
          TD
        </span>
        <div>
          <Link href="/dashboard" className="text-lg font-semibold">
            TaDiff
          </Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/[0.35]">
            Cockpit compagnie
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {Object.entries(navGroups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.35]">
              {group}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-md px-3 py-2.5 text-sm text-white/[0.72] transition hover:bg-white/10 hover:text-white",
                      active && "bg-white/[0.16] text-white shadow-inner shadow-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/25 transition group-hover:bg-accent",
                        active && "bg-accent shadow-[0_0_14px_rgba(29,78,216,0.75)]",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium leading-5">{item.label}</span>
                      <span className="block truncate text-xs leading-4 text-white/[0.42]">
                        {item.summary}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}
