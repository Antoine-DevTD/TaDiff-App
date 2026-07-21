"use client";

import { BookOpen, MoreHorizontal, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { dashboardSections, getDashboardSection } from "@/lib/constants";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { DashboardNavIcon } from "@/components/ui/dashboard-nav-icon";
import { TadiffMark } from "@/components/brand/tadiff-mark";

const adminNavItems = [
  {
    href: "/admin",
    label: "Supervision",
    summary: "Compagnies, facturation, beta et retours",
    initials: "SU",
  },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function Sidebar({ variant = "company" }: { variant?: "admin" | "company" }) {
  const pathname = usePathname();

  if (variant === "admin") {
    return <AdminSidebar pathname={pathname} />;
  }

  return <CompanyNavigation pathname={pathname} />;
}

function CompanyNavigation({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const activeSection = getDashboardSection(pathname);
  const mobileSections = dashboardSections.slice(0, 4);

  useEffect(() => {
    if (!moreOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  return (
    <>
      <div aria-hidden="true" className="hidden w-60 shrink-0 lg:block" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/10 bg-ink text-white shadow-xl shadow-ink/10 lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <TadiffMark className="h-9 w-9 shadow-sm shadow-accent/30" />
          <div className="min-w-0">
            <Link href="/dashboard" className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              TaDiff
            </Link>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
              Cockpit compagnie
            </p>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto p-3">
          {dashboardSections.map((section) => {
            const active = !pathname.startsWith("/settings") && !pathname.startsWith("/resources") && section.id === activeSection.id;

            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-14 items-center gap-3 overflow-hidden rounded-md border border-transparent px-3 py-2.5 text-sm text-white/78 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  "before:absolute before:inset-y-0 before:left-0 before:w-1 before:origin-bottom before:scale-y-0 before:bg-white before:transition-transform before:duration-200",
                  "hover:border-white/10 hover:bg-white/[0.10] hover:text-white hover:before:scale-y-100",
                  active && "border-white/15 bg-white/[0.16] text-white before:scale-y-100",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] text-white/75 transition-colors duration-200 group-hover:bg-white/[0.14] group-hover:text-white",
                    active && "border-white/30 bg-white text-ink",
                  )}
                >
                  <DashboardNavIcon className="h-[18px] w-[18px]" href={section.href} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-5">{section.label}</span>
                  <span className="block truncate text-xs leading-4 text-white/50 group-hover:text-white/70">
                    {section.summary}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <Link
            href="/resources"
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
              pathname.startsWith("/resources") && "bg-white/[0.16] text-white",
            )}
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            Ressources
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
              pathname.startsWith("/settings") && "bg-white/[0.16] text-white",
            )}
          >
            <Settings className="h-4 w-4" aria-hidden />
            Parametres
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-panel/96 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(11,18,32,0.10)] backdrop-blur-xl lg:hidden"
      >
        {mobileSections.map((section) => {
          const active = section.id === activeSection.id;

          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                active && "bg-accent/10 text-accent",
              )}
            >
              <DashboardNavIcon className="h-5 w-5" href={section.href} />
              <span className="max-w-full truncate">{section.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-label="Ouvrir les autres rubriques"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
            (!mobileSections.some((section) => section.id === activeSection.id) ||
              pathname.startsWith("/settings")) &&
              "bg-accent/10 text-accent",
          )}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          Plus
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setMoreOpen(false)}
          />
          <section
            aria-label="Autres rubriques"
            className="absolute inset-x-0 bottom-0 rounded-t-lg border-t border-border bg-panel px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Toutes les rubriques</p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setMoreOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-panel-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {dashboardSections.slice(4).map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-16 items-center gap-3 rounded-md border border-border bg-panel-strong/55 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <DashboardNavIcon className="h-5 w-5 text-accent" href={section.href} />
                  <span>
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className="block text-xs text-muted">{section.summary}</span>
                  </span>
                </Link>
              ))}
              <Link
                href="/resources"
                onClick={() => setMoreOpen(false)}
                className="flex min-h-16 items-center gap-3 rounded-md border border-border bg-panel-strong/55 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <BookOpen className="h-5 w-5 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">Ressources</span>
                  <span className="block text-xs text-muted">Liens et outils utiles</span>
                </span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMoreOpen(false)}
                className="flex min-h-16 items-center gap-3 rounded-md border border-border bg-panel-strong/55 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Settings className="h-5 w-5 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">Parametres</span>
                  <span className="block text-xs text-muted">Compte et donnees</span>
                </span>
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <>
      <div aria-hidden="true" className="hidden w-64 shrink-0 lg:block" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-ink text-white shadow-xl shadow-ink/10 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <TadiffMark className="h-8 w-8 shadow-sm shadow-accent/30" />
        <div>
          <Link href="/admin" className="text-lg font-semibold">
            TaDiff
          </Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/[0.35]">Console interne</p>
        </div>
      </div>
      <nav aria-label="Administration" className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNavItems.map((item) => {
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2.5 text-sm text-white/[0.72] transition-colors hover:bg-white/10 hover:text-white",
                active && "bg-white/[0.16] text-white",
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-xs font-semibold">
                {item.initials}
              </span>
              <span className="min-w-0">
                <span className="block font-medium leading-5">{item.label}</span>
                <span className="block truncate text-xs leading-4 text-white/[0.42]">{item.summary}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
      </aside>
    </>
  );
}
