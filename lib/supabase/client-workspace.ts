"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function ensureClientWorkspace(companyNameFallback = "Ma compagnie") {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Session introuvable." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.company_id) {
    return { ok: true, message: "Workspace existant." };
  }

  const companyName =
    typeof user.user_metadata.company_name === "string"
      ? user.user_metadata.company_name
      : companyNameFallback;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (companyError || !company) {
    return { ok: false, message: companyError?.message ?? "Compagnie non creee." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        company_id: company.id,
        role: "owner",
        full_name: user.email,
      },
      { onConflict: "id" },
    );

  return profileError
    ? { ok: false, message: profileError.message }
    : { ok: true, message: "Workspace cree." };
}
