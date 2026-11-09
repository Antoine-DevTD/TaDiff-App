"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function ensureClientWorkspace(companyNameFallback = "Ma compagnie", requestedPath?: string | null) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Session introuvable." };
  }

  const editorDestination = typeof requestedPath === "string"
    && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    && !/[\\\u0000-\u0020]/.test(requestedPath)
    && /^\/resources\/manage(?:\/|$)/.test(new URL(requestedPath, "https://tadiff.invalid").pathname);
  if (editorDestination) {
    if (!user.email_confirmed_at) return { ok: false, message: "Confirmez votre adresse email avant d’ouvrir l’éditeur." };
    try {
      const { data, error } = await supabase.rpc("can_edit_resources");
      if (error) return { ok: false, message: "L’accès aux ressources ne peut pas être vérifié. Réessayez." };
      if (data !== true) return { ok: false, message: "Ce compte n’est pas autorisé à modifier les ressources." };
      // Explicit editorial access must not create or activate a company.
      return { ok: true, message: "Éditeur de ressources disponible." };
    } catch {
      return { ok: false, message: "L’accès aux ressources ne peut pas être vérifié. Réessayez." };
    }
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
