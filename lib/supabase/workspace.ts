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

export const getWorkspaceBranding = cache(async function getWorkspaceBranding() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseServerUser();

  if (!user) {
    return { label: "Compagnie demo", logoUrl: "", logoScale: 100, logoPositionX: 50, logoPositionY: 50 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return { label: "Espace a configurer", logoUrl: "", logoScale: 100, logoPositionX: 50, logoPositionY: 50 };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name,logo_url,logo_scale,logo_position_x,logo_position_y")
    .eq("id", profile.company_id)
    .maybeSingle();

  return {
    label: company?.name ?? "Compagnie",
    logoUrl: company?.logo_url ?? "",
    logoScale: company?.logo_scale ?? 100,
    logoPositionX: company?.logo_position_x ?? 50,
    logoPositionY: company?.logo_position_y ?? 50,
  };
});

export const getWorkspaceLabel = cache(async function getWorkspaceLabel() {
  return (await getWorkspaceBranding()).label;
});
