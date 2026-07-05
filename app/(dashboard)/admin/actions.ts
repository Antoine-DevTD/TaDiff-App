"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { isSuperAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminBillingSchema,
  type AdminBillingFormInput,
} from "@/lib/validation/admin";

type ActionResult = {
  ok: boolean;
  message: string;
};

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
