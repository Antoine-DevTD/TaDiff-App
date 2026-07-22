import { cache } from "react";
import { getSupabaseServerClient, getSupabaseServerUser } from "@/lib/supabase/server";

export const getOrCreateWorkspace = cache(async function getOrCreateWorkspace() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await getSupabaseServerUser();

  if (userError || !user) {
    return { error: "Vous devez etre connecte.", companyId: null };
  }

  const companyName =
    typeof user.user_metadata.company_name === "string"
      ? user.user_metadata.company_name
      : "Ma compagnie";

  const { data: companyId, error } = await supabase.rpc("ensure_workspace", {
    company_name: companyName,
  });

  if (error || !companyId) {
    return { error: error?.message ?? "Impossible de creer la compagnie.", companyId: null };
  }

  return { error: null, companyId };
});

export const getWorkspaceLabel = cache(async function getWorkspaceLabel() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseServerUser();

  if (!user) {
    return "Compagnie demo";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return "Espace a configurer";
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle();

  return company?.name ?? "Compagnie";
});
