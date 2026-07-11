"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/lib/constants";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { DashboardNavIcon } from "@/components/ui/dashboard-nav-icon";

const navGroups = dashboardNavItems.reduce<Record<string, typeof dashboardNavItems>>((groups, item) => {
  groups[item.group] = [...(groups[item.group] ?? []), item];
  return groups;
}, {});

const adminNavItems = [
  {
    href: "/admin",
    label: "Supervision",
    summary: "Compagnies, billing, bêta, retours",
    initials: "SU",
  },
];

const adminPlannedItems = [
  { label: "Catalogues subventions", summary: "Fonction prévue - Phase C", initials: "CA" },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function Sidebar({ variant = "company" }: { variant?: "admin" | "company" }) {
  const pathname = usePathname();
  const activeGroup = Object.entries(navGroups).find(([, items]) =>
    items.some((item) => isItemActive(pathname, item.href)),
  )?.[0];
  const [openGroup, setOpenGroup] = useState<string | null>(
    activeGroup ?? Object.keys(navGroups)[0] ?? null,
  );

  useEffect(() => {
    if (activeGroup) {
      setOpenGroup(activeGroup);
    }
  }, [activeGroup]);

  if (variant === "admin") {
    return (
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-ink text-white shadow-xl shadow-ink/10 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-bold shadow-sm shadow-accent/30">
            TD
          </span>
          <div>
            <Link href="/admin" className="text-lg font-semibold">
              TaDiff
            </Link>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/[0.35]">
              Console interne
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.35]">
              Administration
            </p>
            <div className="space-y-1">
              {adminNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href);

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
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/50",
                        active && "border-accent/45 bg-accent text-white",
                      )}
                    >
                      {item.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-5">{item.label}</span>
                      <span className="block truncate text-xs leading-4 text-white/[0.42]">
                        {item.summary}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {adminPlannedItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 text-sm text-white/[0.35]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/30">
                    {item.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium leading-5">{item.label}</span>
                    <span className="block truncate text-xs leading-4 text-white/[0.28]">
                      {item.summary}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </nav>
        <div className="border-t border-white/10 p-3">
          <SignOutButton />
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-ink text-white shadow-xl shadow-ink/10 lg:flex lg:flex-col">
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
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {Object.entries(navGroups).map(([group, items]) => {
          const isOpen = openGroup === group;
          const groupHasActiveItem = group === activeGroup;

          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.35] transition hover:text-white/60",
                  groupHasActiveItem && "text-white/60",
                )}
                aria-expanded={isOpen}
              >
                {group}
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
                />
              </button>
              {isOpen ? (
                <div className="space-y-1 pb-3">
                  {items.map((item) => {
                    const active = isItemActive(pathname, item.href);

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
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/50 transition group-hover:border-accent/35 group-hover:text-white",
                            active && "border-accent/45 bg-accent text-white shadow-[0_0_16px_rgba(29,78,216,0.35)]",
                          )}
                        >
                          <DashboardNavIcon className="h-4 w-4" href={item.href} />
                        </span>
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
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}
