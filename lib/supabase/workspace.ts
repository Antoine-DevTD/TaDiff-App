import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrCreateWorkspace() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Vous devez etre connecte.", companyId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.company_id) {
    return { error: null, companyId: profile.company_id };
  }

  const companyName =
    typeof user.user_metadata.company_name === "string"
      ? user.user_metadata.company_name
      : "Ma compagnie";

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (companyError || !company) {
    return {
      error: companyError?.message ?? "Impossible de creer la compagnie.",
      companyId: null,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        company_id: company.id,
        role: "owner",
        full_name:
          typeof user.user_metadata.full_name === "string"
            ? user.user_metadata.full_name
            : user.email,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    return { error: profileError.message, companyId: null };
  }

  return { error: null, companyId: company.id };
}

export async function getWorkspaceLabel() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
}
