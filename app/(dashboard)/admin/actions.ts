"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import {
  hasPlatformPermission,
  isSuperAdmin,
} from "@/lib/supabase/admin";
import { platformPermissionValues, type PlatformPermission } from "@/lib/platform-permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminBillingSchema,
  type AdminBillingFormInput,
} from "@/lib/validation/admin";
import {
  feedbackStatusSchema,
  type FeedbackStatusFormInput,
} from "@/lib/validation/feedback";
import {
  aiSettingsSchema,
  aiCompanyAccessSchema,
  grantCatalogSchema,
  legalInformationSchema,
  patronageCatalogSchema,
  platformEmailTemplateSchema,
  ragDocumentSchema,
  type AiSettingsInput,
  type AiCompanyAccessInput,
  type GrantCatalogInput,
  type LegalInformationInput,
  type PatronageCatalogInput,
  type PlatformEmailTemplateInput,
  type RagDocumentInput,
} from "@/lib/validation/platform-admin";
import type { Json } from "@/types/database.types";
import { createOpenAiEmbeddings, serializeEmbedding } from "@/lib/ai/embeddings";

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

  if (!(await hasPlatformPermission("manage_feedback"))) {
    return { ok: false, message: "Permission de gestion des retours requise." };
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

export async function adminSetMaintenanceMode(enabled: boolean): Promise<ActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "La console admin demande une base Supabase connectee." };
  }

  if (!(await isSuperAdmin())) {
    return { ok: false, message: "Acces reserve aux super admins." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_maintenance_mode", { enabled });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    message: enabled ? "Mode maintenance active." : "Mode maintenance desactive.",
  };
}

export async function adminSetCompanyAiAccess(
  companyId: string,
  values: AiCompanyAccessInput,
): Promise<ActionResult> {
  const parsed = aiCompanyAccessSchema.safeParse(values);
  if (!parsed.success || !companyId) return { ok: false, message: "Configuration de quota invalide." };
  if (!hasSupabaseEnv() || !(await isSuperAdmin())) return { ok: false, message: "Acces reserve aux super admins." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_company_ai", {
    p_company_id: companyId,
    p_enabled: parsed.data.enabled,
    p_monthly_quota: parsed.data.monthlyQuota,
    p_bonus_balance: parsed.data.bonusBalance,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/settings");
  return { ok: true, message: "Acces et quota William mis a jour." };
}

export async function adminSetUserAiAccess(userId: string, enabled: boolean): Promise<ActionResult> {
  if (!userId) return { ok: false, message: "Compte utilisateur invalide." };
  if (!hasSupabaseEnv() || !(await isSuperAdmin())) return { ok: false, message: "Acces reserve aux super admins." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_user_ai_access", {
    p_user_id: userId,
    p_enabled: enabled,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/settings");
  return { ok: true, message: enabled ? "Compte autorise a utiliser William." : "Acces William retire pour ce compte." };
}

export async function adminSetFounderAccount(userId: string, enabled: boolean): Promise<ActionResult> {
  if (!userId) return { ok: false, message: "Compte utilisateur invalide." };
  if (!hasSupabaseEnv() || !(await isSuperAdmin())) return { ok: false, message: "Acces reserve aux super admins." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_founder_account", {
    p_user_id: userId,
    p_enabled: enabled,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return {
    ok: true,
    message: enabled
      ? "Compte fondateur active avec 5 000 000 de tokens mensuels."
      : "Statut fondateur retire.",
  };
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

async function requireAdminDatabase(permission: PlatformPermission) {
  if (!hasSupabaseEnv()) return null;
  if (!(await hasPlatformPermission(permission))) return null;
  return getSupabaseServerClient();
}

export async function adminSetPlatformAdminAccess(
  userId: string,
  permissions: string[],
): Promise<ActionResult> {
  if (!hasSupabaseEnv() || !(await isSuperAdmin())) {
    return { ok: false, message: "Seul un super-admin peut deleguer ces droits." };
  }
  const validPermissions = permissions.filter((permission): permission is PlatformPermission =>
    platformPermissionValues.includes(permission as PlatformPermission),
  );
  if (!userId || validPermissions.length !== permissions.length) {
    return { ok: false, message: "Compte ou permissions invalides." };
  }
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_platform_admin", {
    target_user_id: userId,
    new_permissions: validPermissions,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return {
    ok: true,
    message: validPermissions.length ? "Droits administrateur enregistres." : "Acces administrateur retire.",
  };
}

export async function adminSaveLegalInformation(values: LegalInformationInput): Promise<ActionResult> {
  const parsed = legalInformationSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Certaines informations legales sont invalides." };
  const supabase = await requireAdminDatabase("manage_legal");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("platform_settings").upsert({
    key: "legal_information",
    value: parsed.data as Json,
    public_read: true,
    updated_by: userData.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };
  ["/admin", "/mentions-legales", "/cgu", "/cgv", "/confidentialite", "/annexe-rgpd"].forEach((path) => revalidatePath(path));
  return { ok: true, message: "Informations publiees sans redeploiement." };
}

export async function adminSaveGrantCatalogItem(id: string | null, values: GrantCatalogInput): Promise<ActionResult> {
  const parsed = grantCatalogSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Aide invalide." };
  const supabase = await requireAdminDatabase("manage_catalogs");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const payload = {
    title: parsed.data.title,
    funder: parsed.data.funder,
    territory: parsed.data.territory || null,
    discipline: parsed.data.discipline || null,
    deadline: parsed.data.deadline || null,
    amount_max: parsed.data.amountMax,
    eligibility: parsed.data.eligibility || null,
    requirements: parsed.data.requirements,
    themes: parsed.data.themes,
    source_url: parsed.data.sourceUrl || null,
    active: parsed.data.active,
    last_verified_at: parsed.data.lastVerifiedAt || null,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("grant_catalog").update(payload).eq("id", id)
    : await supabase.from("grant_catalog").insert(payload);
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/admin");
  return { ok: true, message: id ? "Aide mise a jour." : "Aide ajoutee au catalogue." };
}

export async function adminDeleteGrantCatalogItem(id: string): Promise<ActionResult> {
  const supabase = await requireAdminDatabase("manage_catalogs");
  if (!supabase) return { ok: false, message: "Acces super-admin requis." };
  const { error } = await supabase.from("grant_catalog").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Aide supprimee du catalogue et du corpus William." };
}

export async function adminSavePatronageCatalogItem(id: string | null, values: PatronageCatalogInput): Promise<ActionResult> {
  const parsed = patronageCatalogSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Programme invalide." };
  const supabase = await requireAdminDatabase("manage_catalogs");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const payload = {
    organization_name: parsed.data.organizationName,
    program_name: parsed.data.programName,
    themes: parsed.data.themes,
    territories: parsed.data.territories,
    next_deadline: parsed.data.nextDeadline || null,
    amount_min: parsed.data.amountMin,
    amount_max: parsed.data.amountMax,
    eligibility: parsed.data.eligibility || null,
    source_url: parsed.data.sourceUrl || null,
    notes: parsed.data.notes || null,
    active: parsed.data.active,
    last_verified_at: parsed.data.lastVerifiedAt || null,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("patronage_catalog").update(payload).eq("id", id)
    : await supabase.from("patronage_catalog").insert(payload);
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/admin");
  return { ok: true, message: id ? "Programme mis a jour." : "Programme ajoute au catalogue." };
}

export async function adminDeletePatronageCatalogItem(id: string): Promise<ActionResult> {
  const supabase = await requireAdminDatabase("manage_catalogs");
  if (!supabase) return { ok: false, message: "Acces super-admin requis." };
  const { error } = await supabase.from("patronage_catalog").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Programme supprime du catalogue et du corpus William." };
}

export async function adminSavePlatformEmailTemplate(id: string | null, values: PlatformEmailTemplateInput): Promise<ActionResult> {
  const parsed = platformEmailTemplateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Le modele d'email est incomplet." };
  const supabase = await requireAdminDatabase("manage_email_templates");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const payload = {
    name: parsed.data.name,
    message_type: parsed.data.messageType,
    subject_template: parsed.data.subjectTemplate,
    body_json: parsed.data.bodyJson as Json,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("platform_email_templates").update(payload).eq("id", id)
    : await supabase.from("platform_email_templates").insert(payload);
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/admin");
  revalidatePath("/campaigns");
  return { ok: true, message: id ? "Modele global mis a jour." : "Modele global cree." };
}

export async function adminDeletePlatformEmailTemplate(id: string): Promise<ActionResult> {
  const supabase = await requireAdminDatabase("manage_email_templates");
  if (!supabase) return { ok: false, message: "Acces super-admin requis." };
  const { error } = await supabase.from("platform_email_templates").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/campaigns");
  return { ok: true, message: "Modele global supprime." };
}

export async function adminSaveAiSettings(values: AiSettingsInput): Promise<ActionResult> {
  const parsed = aiSettingsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Configuration IA invalide." };
  const supabase = await requireAdminDatabase("manage_ai");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("ai_settings").upsert({
    id: true,
    enabled: parsed.data.enabled,
    provider: parsed.data.provider,
    model: parsed.data.model,
    embedding_provider: parsed.data.embeddingProvider,
    embedding_model: parsed.data.embeddingModel,
    rag_top_k: parsed.data.ragTopK,
    system_prompt: parsed.data.systemPrompt,
    updated_by: userData.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Configuration William enregistree. Les secrets restent dans Vercel." };
}

export async function adminSaveRagDocument(id: string | null, values: RagDocumentInput): Promise<ActionResult> {
  const parsed = ragDocumentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Document invalide." };
  const supabase = await requireAdminDatabase("manage_ai");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const payload = {
    title: parsed.data.title,
    content: parsed.data.content,
    source_url: parsed.data.sourceUrl || null,
    active: parsed.data.active,
    embedding: null,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("rag_documents").update(payload).eq("id", id).eq("source_type", "manual")
    : await supabase.from("rag_documents").insert({
        ...payload,
        company_id: null,
        source_type: "manual",
      });
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/admin");
  return { ok: true, message: id ? "Source mise a jour ; son embedding doit etre regenere." : "Source ajoutee au corpus." };
}

export async function adminDeleteRagDocument(id: string): Promise<ActionResult> {
  const supabase = await requireAdminDatabase("manage_ai");
  if (!supabase) return { ok: false, message: "Acces super-admin requis." };
  const { error } = await supabase.from("rag_documents").delete().eq("id", id).eq("source_type", "manual");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Source manuelle supprimee." };
}

export async function adminIndexRagDocuments(): Promise<ActionResult> {
  const supabase = await requireAdminDatabase("manage_ai");
  if (!supabase) return { ok: false, message: "Acces super-admin et migration 038 requis." };
  const { data: settings, error: settingsError } = await supabase
    .from("ai_settings")
    .select("embedding_provider,embedding_model")
    .eq("id", true)
    .maybeSingle();
  if (settingsError || !settings) return { ok: false, message: "Configuration d'embedding introuvable." };
  if (settings.embedding_provider !== "openai") {
    return { ok: false, message: "L'indexation Supabase gte-small demandera une Edge Function. Selectionnez OpenAI pour indexer depuis Next.js." };
  }
  const { data: documents, error } = await supabase
    .from("rag_documents")
    .select("id,title,content")
    .eq("active", true)
    .is("embedding", null)
    .limit(40);
  if (error) return { ok: false, message: error.message };
  if (!documents?.length) return { ok: true, message: "Toutes les sources actives sont deja indexees." };

  try {
    const embeddings = await createOpenAiEmbeddings(
      documents.map((document) => `${document.title}\n\n${document.content}`),
      settings.embedding_model,
    );
    for (const [index, document] of documents.entries()) {
      const { error: updateError } = await supabase
        .from("rag_documents")
        .update({ embedding: serializeEmbedding(embeddings[index]) })
        .eq("id", document.id);
      if (updateError) return { ok: false, message: `Indexation interrompue : ${updateError.message}` };
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Indexation impossible." };
  }
  revalidatePath("/admin");
  return { ok: true, message: `${documents.length} source(s) indexee(s). Relancez si plus de 40 sources restent en attente.` };
}
