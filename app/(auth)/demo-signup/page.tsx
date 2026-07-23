import { redirect } from "next/navigation";
import { DemoSignupForm } from "@/components/onboarding/demo-signup-form";
import { demoWebinarEmail } from "@/lib/demo-webinar";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DemoSignupPage() {
  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    if (user.email?.toLowerCase() !== demoWebinarEmail) redirect("/dashboard");
  }

  return <DemoSignupForm />;
}
