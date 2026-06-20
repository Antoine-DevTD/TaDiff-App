"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/lib/constants";

function titleFromPath(pathname: string) {
  const current = dashboardNavItems.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  return current?.label ?? "Espace compagnie";
}

export function Topbar({ workspaceLabel }: { workspaceLabel: string }) {
  const pathname = usePathname();
  const activeLabel = titleFromPath(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-background/86 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{workspaceLabel}</p>
          <h1 className="text-lg font-semibold">{activeLabel}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/shows/new"
            className="hidden rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium shadow-sm shadow-ink/20 transition hover:bg-white/10 sm:inline-flex"
          >
            Nouveau spectacle
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            TD
          </div>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 text-sm lg:hidden">
        {dashboardNavItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-white"
                  : "shrink-0 rounded-full bg-panel px-3 py-1.5 text-muted"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
