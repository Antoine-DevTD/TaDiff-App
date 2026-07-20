import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export type LegalInformation = {
  serviceName: string;
  operatorName: string;
  operatorLegalForm: string;
  operatorAddress: string;
  operatorRegistration: string;
  operatorVat: string;
  publicationDirector: string;
  professionalPhone: string;
  legalEmail: string;
  privacyEmail: string;
  supportEmail: string;
  billingEmail: string;
  betaPrice: string;
  legalVersion: string;
};

export const fallbackLegalInformation: LegalInformation = {
  serviceName: "TaDiff",
  operatorName: process.env.NEXT_PUBLIC_LEGAL_NAME || "ARKENCIEL Compagnie",
  operatorLegalForm: process.env.NEXT_PUBLIC_LEGAL_FORM || "Forme juridique a completer",
  operatorAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "Adresse du siege a completer avant la beta",
  operatorRegistration: process.env.NEXT_PUBLIC_LEGAL_REGISTRATION || "SIREN et RCS a completer",
  operatorVat: process.env.NEXT_PUBLIC_LEGAL_VAT || "Numero de TVA a completer si applicable",
  publicationDirector: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || "Directeur de publication a completer avant la beta",
  professionalPhone: process.env.NEXT_PUBLIC_LEGAL_PHONE || "",
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "contact@tadiff.com",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "contact@tadiff.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@tadiff.com",
  billingEmail: process.env.NEXT_PUBLIC_BILLING_EMAIL || "contact@tadiff.com",
  betaPrice: process.env.NEXT_PUBLIC_BETA_PRICE || "19,99 EUR TTC par mois",
  legalVersion: process.env.NEXT_PUBLIC_LEGAL_VERSION || "1.0",
};

export async function getLegalInformation(): Promise<LegalInformation> {
  if (!hasSupabaseEnv()) return fallbackLegalInformation;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "legal_information")
    .eq("public_read", true)
    .maybeSingle();

  if (error || !data) return fallbackLegalInformation;

  return mergeLegalInformation(data.value);
}

export function mergeLegalInformation(value: Json): LegalInformation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallbackLegalInformation;
  }

  const record = value as Record<string, Json | undefined>;
  const result = { ...fallbackLegalInformation };

  for (const key of Object.keys(result) as Array<keyof LegalInformation>) {
    if (typeof record[key] === "string") result[key] = record[key];
  }

  return result;
}
