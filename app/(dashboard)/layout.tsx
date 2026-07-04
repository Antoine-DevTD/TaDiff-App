import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TheatreThemeSwitcher } from "@/components/theme/theatre-theme-switcher";
import { Topbar } from "@/components/layout/topbar";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceLabel } from "@/lib/supabase/workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let workspaceLabel = "Compagnie demo";

  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    workspaceLabel = await getWorkspaceLabel();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar workspaceLabel={workspaceLabel} />
        <TheatreThemeSwitcher />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
