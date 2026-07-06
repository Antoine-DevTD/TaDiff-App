import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { GuidedTour } from "@/components/tour/guided-tour";
import { WilliamAssistant } from "@/components/william/william-assistant";
import { TheatreThemeSwitcher } from "@/components/theme/theatre-theme-switcher";
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
      <Sidebar variant={superAdmin ? "admin" : "company"} />
      <div className="min-w-0 flex-1">
        <Topbar showFeedback={!superAdmin} workspaceLabel={workspaceLabel} />
        <TheatreThemeSwitcher />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {superAdmin ? null : <GuidedTour />}
      {superAdmin ? null : <WilliamAssistant />}
    </div>
  );
}
