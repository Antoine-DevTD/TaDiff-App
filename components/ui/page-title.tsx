import type { ReactNode } from "react";
import { DashboardNavIcon } from "@/components/ui/dashboard-nav-icon";
import { cn } from "@/lib/utils";

export function PageTitle({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel-strong text-accent">
        <DashboardNavIcon className="h-4 w-4" href={href} />
      </span>
      <h2 className={cn("min-w-0 text-2xl font-semibold", className)}>{children}</h2>
    </div>
  );
}
