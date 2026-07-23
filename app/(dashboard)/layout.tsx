import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccessTracker } from "@/components/audit/access-tracker";
import { Sidebar } from "@/components/layout/sidebar";
import { DeferredDashboardTools } from "@/components/layout/deferred-dashboard-tools";
import { WilliamAssistant } from "@/components/william/william-assistant";
import { ThemeApplier } from "@/components/theme/theme-applier";
import { Topbar } from "@/components/layout/topbar";
import { hasSupabaseEnv } from "@/lib/env";
import { getPlatformAdminAccess } from "@/lib/supabase/admin";
import { getSupabaseServerUser } from "@/lib/supabase/server";
import { getWorkspaceBranding } from "@/lib/supabase/workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let workspaceLabel = "Compagnie demo";
  let companyLogoUrl = "";
  let superAdmin = false;

  if (hasSupabaseEnv()) {
    const {
      data: { user },
    } = await getSupabaseServerUser();

    if (!user) {
      redirect("/login");
    }

    const [platformAccess, workspaceBranding] = await Promise.all([
      getPlatformAdminAccess(),
      getWorkspaceBranding(),
    ]);
    superAdmin = platformAccess.isSuperAdmin || platformAccess.permissions.length > 0;
    workspaceLabel = superAdmin ? "Console interne" : workspaceBranding.label;
    companyLogoUrl = superAdmin ? "" : workspaceBranding.logoUrl;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ThemeApplier />
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[120] -translate-y-24 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Aller au contenu
      </a>
      <Sidebar variant={superAdmin ? "admin" : "company"} />
      <div className="min-w-0 flex-1">
        <Topbar workspaceLabel={workspaceLabel} companyLogoUrl={companyLogoUrl} />
        <main
          id="main-content"
          tabIndex={-1}
          className="px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8"
        >
          {children}
        </main>
      </div>
      {superAdmin ? null : <DeferredDashboardTools />}
      {superAdmin ? null : (
        <Suspense fallback={null}>
          <WilliamAssistant />
        </Suspense>
      )}
      <AccessTracker />
    </div>
  );
}
