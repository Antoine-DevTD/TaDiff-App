import { hasSupabaseEnv } from "@/lib/env";
import { cache } from "react";
import { getSupabaseServerClient, getSupabaseServerUser } from "@/lib/supabase/server";

export type CompanyRole = "owner" | "admin" | "member" | "readonly";
export type BillingStatus = "trial" | "active" | "comped" | "past_due" | "cancelled";

export type WorkspaceAccess = {
  companyId: string | null;
  role: CompanyRole | null;
  billingStatus: BillingStatus | null;
  planCode: string | null;
  compedUntil: string | null;
  hasAccess: boolean;
  canManage: boolean;
  error: string | null;
};

const demoAccess: WorkspaceAccess = {
  companyId: null,
  role: "owner",
  billingStatus: "trial",
  planCode: "beta",
  compedUntil: null,
  hasAccess: true,
  canManage: true,
  error: null,
};

function isCompedActive(compedUntil: string | null) {
  if (!compedUntil) return true;
  return new Date(compedUntil) >= new Date(new Date().toDateString());
}

export function computeHasAccess(
  billingStatus: BillingStatus | null,
  compedUntil: string | null,
) {
  if (billingStatus === "trial" || billingStatus === "active") return true;
  if (billingStatus === "comped") return isCompedActive(compedUntil);
  return false;
}

/**
 * Lit le role de l'utilisateur courant et le statut billing de sa compagnie.
 * En mode demo (pas d'env Supabase), tout est ouvert.
 */
export const getWorkspaceAccess = cache(async function getWorkspaceAccess(): Promise<WorkspaceAccess> {
  if (!hasSupabaseEnv()) {
    return demoAccess;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseServerUser();

  if (!user) {
    return {
      ...demoAccess,
      role: null,
      billingStatus: null,
      planCode: null,
      hasAccess: false,
      canManage: false,
      error: "Vous devez etre connecte.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    return {
      ...demoAccess,
      role: null,
      billingStatus: null,
      planCode: null,
      hasAccess: false,
      canManage: false,
      error: profileError?.message ?? "Compagnie introuvable.",
    };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("billing_status,plan_code,comped_until")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (companyError || !company) {
    return {
      companyId: profile.company_id,
      role: profile.role,
      billingStatus: null,
      planCode: null,
      compedUntil: null,
      hasAccess: false,
      canManage: false,
      error: companyError?.message ?? "Statut compagnie introuvable.",
    };
  }

  return {
    companyId: profile.company_id,
    role: profile.role,
    billingStatus: company.billing_status,
    planCode: company.plan_code,
    compedUntil: company.comped_until,
    hasAccess: computeHasAccess(company.billing_status, company.comped_until),
    canManage: profile.role === "owner" || profile.role === "admin",
    error: null,
  };
});

/**
 * Garde pour toute mutation : refuse le role readonly et les compagnies
 * dont l'acces est suspendu. Retourne null si l'action est autorisee,
 * sinon un message d'erreur affichable.
 */
export async function requireWriteAccess(): Promise<string | null> {
  const access = await getWorkspaceAccess();

  if (access.error) return access.error;
  if (!access.hasAccess) return "L'acces de la compagnie est suspendu (abonnement).";
  if (access.role === "readonly") return "Votre role est en lecture seule.";

  return null;
}

/**
 * Garde pour Server Actions sensibles : refuse aussi les roles member.
 * Retourne null si l'action est autorisee, sinon un message d'erreur.
 */
export async function requireManagerAccess(): Promise<string | null> {
  const access = await getWorkspaceAccess();

  if (access.error) return access.error;
  if (!access.hasAccess) return "L'acces de la compagnie est suspendu (abonnement).";
  if (!access.canManage) return "Cette action demande un role owner ou admin.";

  return null;
}
