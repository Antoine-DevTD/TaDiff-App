import { redirect } from "next/navigation";
import { AccessTracker } from "@/components/audit/access-tracker";
import { Sidebar } from "@/components/layout/sidebar";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { GuidedTour } from "@/components/tour/guided-tour";
import { WilliamAssistant } from "@/components/william/william-assistant";
import { ThemeApplier } from "@/components/theme/theme-applier";
import { Topbar } from "@/components/layout/topbar";
import { hasSupabaseEnv } from "@/lib/env";
import { isSuperAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceLabel } from "@/lib/supabase/workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let workspaceLabel = "Compagnie demo";
  let superAdmin = false;

  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    superAdmin = await isSuperAdmin();
    workspaceLabel = superAdmin ? "Console interne" : await getWorkspaceLabel();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ThemeApplier />
      <Sidebar variant={superAdmin ? "admin" : "company"} />
      <div className="min-w-0 flex-1">
        <Topbar workspaceLabel={workspaceLabel} />
        <main className="px-4 pb-32 pt-8 sm:px-6 lg:px-8 lg:pb-14 lg:pt-10">{children}</main>
      </div>
      {superAdmin ? null : <GuidedTour />}
      {superAdmin ? null : <WilliamAssistant />}
      <AccessTracker />
      {superAdmin ? null : (
        <FeedbackWidget triggerClassName="fixed bottom-7 right-24 z-40 hidden items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-sm font-medium shadow-lg shadow-ink/10 transition hover:bg-panel-strong sm:inline-flex print:hidden" />
      )}
    </div>
  );
}
