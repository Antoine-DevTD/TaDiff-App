"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { ContactCreateDialog } from "@/components/contacts/contact-create-dialog";
import { AccountMenu } from "@/components/layout/account-menu";
import { ShowCreateDialog } from "@/components/shows/show-create-dialog";
import { DashboardNavIcon } from "@/components/ui/dashboard-nav-icon";
import { Button } from "@/components/ui/button";
import {
  getDashboardItem,
  getDashboardSection,
  getDashboardSectionItems,
  pipelineCreateEvent,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Topbar({ workspaceLabel }: { workspaceLabel: string }) {
  const pathname = usePathname();
  const activeItem = getDashboardItem(pathname);
  const activeSection = getDashboardSection(pathname);
  const sectionItems = getDashboardSectionItems(activeSection.id);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-panel/92 backdrop-blur-xl">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-[0.14em] text-muted">
            {workspaceLabel}
          </p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel-strong text-accent">
              <DashboardNavIcon className="h-[18px] w-[18px]" href={activeItem?.href ?? activeSection.href} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">
                {activeItem?.label ?? activeSection.label}
              </h1>
              <p className="hidden truncate text-xs text-muted sm:block">
                {activeItem?.summary ?? activeSection.summary}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {pathname === "/shows" ? <ShowCreateDialog label="Ajouter" /> : null}
          {pathname === "/contacts" ? <ContactCreateDialog buttonLabel="Ajouter" /> : null}
          {pathname === "/pipeline" ? (
            <Button
              type="button"
              className="gap-2"
              data-tour="diffusion-creation"
              onClick={() => window.dispatchEvent(new Event(pipelineCreateEvent))}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Ajouter une date</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          ) : null}
          <AccountMenu />
        </div>
      </div>

      {sectionItems.length > 1 ? (
        <nav
          aria-label={`Rubriques ${activeSection.label}`}
          className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:px-6"
        >
          {sectionItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-panel-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                  active && "bg-accent/10 text-accent",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
