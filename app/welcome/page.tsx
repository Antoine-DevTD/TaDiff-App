import { redirect } from "next/navigation";
import { WelcomeOnboarding } from "@/components/onboarding/welcome-onboarding";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  let initialFullName = "";
  let initialCompanyName = "";
  let initialLogoUrl = "";
  const params = await searchParams;
  const devPreview = process.env.NODE_ENV !== "production" && params?.preview === "1";

  if (hasSupabaseEnv() && !devPreview) {
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
