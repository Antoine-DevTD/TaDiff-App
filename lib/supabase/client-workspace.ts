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

  const companyName =
    typeof user.user_metadata.company_name === "string"
      ? user.user_metadata.company_name
      : companyNameFallback;

  const { error } = await supabase.rpc("ensure_workspace", {
    company_name: companyName,
  });

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Workspace pret." };
}
