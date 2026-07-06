"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { isSuperAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminBillingSchema,
  type AdminBillingFormInput,
} from "@/lib/validation/admin";
import {
  feedbackStatusSchema,
  type FeedbackStatusFormInput,
} from "@/lib/validation/feedback";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function adminSetFeedbackStatus(
  feedbackId: string,
  values: FeedbackStatusFormInput,
): Promise<ActionResult> {
  const parsed = feedbackStatusSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Statut de retour invalide." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, message: "La console admin demande une base Supabase connectee." };
  }

  if (!(await isSuperAdmin())) {
    return { ok: false, message: "Acces reserve aux super admins." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_feedback_status", {
    target_feedback_id: feedbackId,
    new_status: parsed.data.status,
    new_response: parsed.data.response ?? "",
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");

  return { ok: true, message: "Retour mis a jour." };
}

export async function adminUpdateCompanyBilling(
  companyId: string,
  values: AdminBillingFormInput,
): Promise<ActionResult> {
  const parsed = adminBillingSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire billing contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, message: "La console admin demande une base Supabase connectee." };
  }

  if (!(await isSuperAdmin())) {
    return { ok: false, message: "Acces reserve aux super admins." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_company_billing", {
    target_company_id: companyId,
    new_status: parsed.data.billingStatus,
    new_plan_code: parsed.data.planCode ?? "",
    new_comped_until: parsed.data.compedUntil || null,
    new_notes: parsed.data.billingNotes ?? "",
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");

  return { ok: true, message: "Compagnie mise a jour." };
}
