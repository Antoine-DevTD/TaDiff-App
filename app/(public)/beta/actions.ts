"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  betaSignupSchema,
  type BetaSignupFormInput,
} from "@/lib/validation/beta";
import type { BetaSignupStatus } from "@/types";

type BetaSignupResult = {
  ok: boolean;
  message: string;
  position?: number;
  status?: BetaSignupStatus;
};

export async function registerBetaSignup(
  values: BetaSignupFormInput,
): Promise<BetaSignupResult> {
  const parsed = betaSignupSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire beta contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode demo : inscription beta valide, non enregistree.",
      position: 4,
      status: "reserved",
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("register_beta_signup", {
    signup_company_name: parsed.data.companyName,
    signup_contact_name: parsed.data.contactName,
    signup_email: parsed.data.email,
    signup_phone: parsed.data.phone || "",
    signup_city: parsed.data.city || "",
    signup_discipline: parsed.data.discipline,
    signup_main_need: parsed.data.mainNeed,
  });
  const signup = Array.isArray(data) ? data[0] : data;

  if (error || !signup) {
    return {
      ok: false,
      message: error?.message ?? "Impossible d'enregistrer l'inscription beta.",
    };
  }

  revalidatePath("/beta");

  return {
    ok: true,
    message:
      signup.status === "reserved"
        ? "Place beta reservee."
        : "Vous etes sur liste d'attente.",
    position: signup.position,
    status: signup.status,
  };
}
