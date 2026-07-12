import { redirect } from "next/navigation";
import { WelcomeOnboarding } from "@/components/onboarding/welcome-onboarding";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  let initialFullName = "";
  let initialCompanyName = "";
  let initialLogoUrl = "";

  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    initialFullName =
      typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";
    initialCompanyName =
      typeof user.user_metadata.company_name === "string"
        ? user.user_metadata.company_name
        : "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.full_name) {
      initialFullName = profile.full_name;
    }

    if (profile?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name,logo_url")
        .eq("id", profile.company_id)
        .maybeSingle();

      initialCompanyName = company?.name ?? initialCompanyName;
      initialLogoUrl = company?.logo_url ?? "";
    }
  } else {
    initialCompanyName = "Compagnie demo";
  }

  return (
    <WelcomeOnboarding
      initialCompanyName={initialCompanyName}
      initialFullName={initialFullName}
      initialLogoUrl={initialLogoUrl}
    />
  );
}
