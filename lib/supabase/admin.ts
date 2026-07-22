import { hasSupabaseEnv } from "@/lib/env";
import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingStatus } from "@/lib/supabase/access";
import { fallbackLegalInformation, mergeLegalInformation, type LegalInformation } from "@/lib/legal";
import type { Json } from "@/types/database.types";
import { platformPermissionValues, type PlatformPermission } from "@/lib/platform-permissions";
export { platformPermissionValues } from "@/lib/platform-permissions";
export type { PlatformPermission } from "@/lib/platform-permissions";

export type AdminCompany = {
  id: string;
  name: string;
  billingStatus: BillingStatus;
  planCode: string;
  compedUntil: string | null;
  billingNotes: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  showCount: number;
  contactCount: number;
  dealCount: number;
  lastActivity: string | null;
};

export type AdminBetaSignup = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  discipline: string;
  mainNeed: string;
  status: "reserved" | "waitlist";
  position: number;
  isDemo: boolean;
  createdAt: string;
};

export type FeedbackKind = "bug" | "idee" | "avis";
export type FeedbackStatus = "nouveau" | "en_cours" | "traite";

export type AdminFeedback = {
  id: string;
  companyId: string;
  companyName: string;
  actorName: string;
  page: string;
  kind: FeedbackKind;
  message: string;
  status: FeedbackStatus;
  adminResponse: string;
  createdAt: string;
};

export type AdminAccessEvent = {
  id: string;
  userId: string | null;
  email: string;
  companyId: string | null;
  companyName: string;
  actorName: string;
  eventType: "login" | "signup" | "page_view";
  path: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
};

export type AdminPublicAnalyticsEvent = {
  id: string;
  sessionId: string;
  eventType: "page_view" | "cta_click" | "beta_signup";
  path: string;
  eventName: string;
  target: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  deviceType: "mobile" | "tablet" | "desktop";
  createdAt: string;
};

export type AdminGrantCatalogItem = {
  id: string;
  title: string;
  funder: string;
  territory: string;
  discipline: string;
  deadline: string;
  amountMax: number;
  eligibility: string;
  requirements: string[];
  themes: string[];
  sourceUrl: string;
  active: boolean;
  lastVerifiedAt: string;
};

export type AdminPatronageCatalogItem = {
  id: string;
  organizationName: string;
  programName: string;
  themes: string[];
  territories: string[];
  nextDeadline: string;
  amountMin: number;
  amountMax: number;
  eligibility: string;
  sourceUrl: string;
  notes: string;
  active: boolean;
  lastVerifiedAt: string;
};

export type AdminPlatformEmailTemplate = {
  id: string;
  name: string;
  messageType: "first-touch" | "follow-up" | "date-option";
  subjectTemplate: string;
  bodyJson: Json;
  active: boolean;
  updatedAt: string;
};

export type AdminAiSettings = {
  enabled: boolean;
  provider: "deepseek" | "openai" | "anthropic" | "mistral";
  model: string;
  embeddingProvider: "openai" | "supabase";
  embeddingModel: string;
  ragTopK: number;
  systemPrompt: string;
};

export type AdminRagDocument = {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl: string;
  active: boolean;
  embedded: boolean;
  updatedAt: string;
};

export type AiProviderReadiness = {
  openai: boolean;
  deepseek: boolean;
  anthropic: boolean;
  mistral: boolean;
};

export type AdminAiAccount = {
  userId: string;
  email: string;
  fullName: string;
  companyId: string;
  companyName: string;
  companyEnabled: boolean;
  userEnabled: boolean;
  isSuperAdmin: boolean;
  isFounder: boolean;
  role: string;
  monthlyQuota: number;
  monthlyUsed: number;
  accountMonthlyUsed: number;
  bonusBalance: number;
};

export type AdminWilliamQuestionEvent = {
  id: string;
  questionExcerpt: string;
  topic: string;
  requestKind: string;
  answered: boolean;
  outOfScope: boolean;
  createdAt: string;
};

export type PlatformAdminAccess = { isSuperAdmin: boolean; permissions: PlatformPermission[] };
export type AdminPlatformAdmin = { userId: string; email: string; fullName: string; permissions: PlatformPermission[]; updatedAt: string };

/** Le flag is_super_admin ne se donne qu'en SQL (voir sql/013_super_admin.sql). */
export async function isSuperAdmin(): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_super_admin_user");

  if (error) {
    return false;
  }

  return data === true;
}

export const getPlatformAdminAccess = cache(async function getPlatformAdminAccess(): Promise<PlatformAdminAccess> {
  if (!hasSupabaseEnv()) return { isSuperAdmin: false, permissions: [] };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_my_platform_permissions");
  const row = data?.[0];
  if (error || !row) return { isSuperAdmin: false, permissions: [] };
  return {
    isSuperAdmin: row.is_super_admin,
    permissions: (row.permissions ?? []).filter((permission): permission is PlatformPermission => platformPermissionValues.includes(permission as PlatformPermission)),
  };
});

export async function hasPlatformPermission(permission: PlatformPermission) {
  const access = await getPlatformAdminAccess();
  return access.isSuperAdmin || access.permissions.includes(permission);
}

export async function getAdminPlatformAdmins(): Promise<AdminPlatformAdmin[]> {
  if (!hasSupabaseEnv() || !(await isSuperAdmin())) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_platform_admins");
  if (error || !data) return [];
  return data.map((entry) => ({
    userId: entry.user_id,
    email: entry.email,
    fullName: entry.full_name,
    permissions: (entry.permissions ?? []).filter((permission): permission is PlatformPermission => platformPermissionValues.includes(permission as PlatformPermission)),
    updatedAt: entry.updated_at,
  }));
}

export async function getAdminCompanies(): Promise<AdminCompany[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_companies");

  if (error || !data) {
    return [];
  }

  return data.map((company) => ({
    id: company.id,
    name: company.name,
    billingStatus: company.billing_status,
    planCode: company.plan_code,
    compedUntil: company.comped_until,
    billingNotes: company.billing_notes ?? "",
    createdAt: company.created_at,
    ownerName: "owner_name" in company ? company.owner_name ?? "" : "",
    ownerEmail: "owner_email" in company ? company.owner_email ?? "" : "",
    memberCount: company.member_count,
    showCount: company.show_count,
    contactCount: company.contact_count,
    dealCount: company.deal_count,
    lastActivity: company.last_activity,
  }));
}

export async function getAdminBetaSignups(): Promise<AdminBetaSignup[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_beta_signups");

  if (error || !data) {
    return [];
  }

  return data.map((signup) => ({
    id: signup.id,
    companyName: signup.company_name,
    contactName: signup.contact_name,
    email: signup.email,
    phone: signup.phone ?? "",
    city: signup.city ?? "",
    discipline: signup.discipline,
    mainNeed: signup.main_need,
    status: signup.status,
    position: signup.position,
    isDemo: signup.is_demo,
    createdAt: signup.created_at,
  }));
}

export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_feedback");

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    companyId: entry.company_id,
    companyName: entry.company_name,
    actorName: entry.actor_name,
    page: entry.page ?? "",
    kind: entry.kind,
    message: entry.message,
    status: entry.status,
    adminResponse: entry.admin_response ?? "",
    createdAt: entry.created_at,
  }));
}

export async function getAdminMaintenanceMode(): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("app_settings").select("maintenance_mode").maybeSingle();

  return data?.maintenance_mode ?? false;
}

export async function getAdminAccessEvents(limit = 80): Promise<AdminAccessEvent[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_access_events", {
    limit_count: limit,
  });

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    email: entry.email ?? "",
    companyId: entry.company_id,
    companyName: entry.company_name ?? "",
    actorName: entry.actor_name ?? "Utilisateur",
    eventType: entry.event_type,
    path: entry.path ?? "",
    ipAddress: entry.ip_address ?? "",
    userAgent: entry.user_agent ?? "",
    createdAt: entry.created_at,
  }));
}

export async function getAdminPublicAnalyticsEvents(
  days = 30,
  limit = 2000,
): Promise<AdminPublicAnalyticsEvent[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_public_analytics_events", {
    since_days: days,
    limit_count: limit,
  });

  if (error || !data) return [];

  return data.map((entry) => ({
    id: entry.id,
    sessionId: entry.session_id,
    eventType: entry.event_type,
    path: entry.path,
    eventName: entry.event_name ?? "",
    target: entry.target ?? "",
    referrerHost: entry.referrer_host ?? "",
    utmSource: entry.utm_source ?? "",
    utmMedium: entry.utm_medium ?? "",
    utmCampaign: entry.utm_campaign ?? "",
    utmContent: entry.utm_content ?? "",
    deviceType: entry.device_type,
    createdAt: entry.created_at,
  }));
}

export async function getAdminLegalInformation(): Promise<LegalInformation> {
  if (!hasSupabaseEnv()) return fallbackLegalInformation;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "legal_information")
    .maybeSingle();

  return error || !data ? fallbackLegalInformation : mergeLegalInformation(data.value);
}

export async function getAdminGrantCatalog(): Promise<AdminGrantCatalogItem[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("grant_catalog").select("*").order("deadline");
  if (error || !data) return [];
  return data.map((item) => ({
    id: item.id,
    title: item.title,
    funder: item.funder,
    territory: item.territory ?? "",
    discipline: item.discipline ?? "",
    deadline: item.deadline ?? "",
    amountMax: item.amount_max,
    eligibility: item.eligibility ?? "",
    requirements: item.requirements ?? [],
    themes: item.themes ?? [],
    sourceUrl: item.source_url ?? "",
    active: item.active,
    lastVerifiedAt: item.last_verified_at ?? "",
  }));
}

export async function getAdminPatronageCatalog(): Promise<AdminPatronageCatalogItem[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("patronage_catalog").select("*").order("next_deadline");
  if (error || !data) return [];
  return data.map((item) => ({
    id: item.id,
    organizationName: item.organization_name,
    programName: item.program_name,
    themes: item.themes ?? [],
    territories: item.territories ?? [],
    nextDeadline: item.next_deadline ?? "",
    amountMin: item.amount_min,
    amountMax: item.amount_max,
    eligibility: item.eligibility ?? "",
    sourceUrl: item.source_url ?? "",
    notes: item.notes ?? "",
    active: item.active,
    lastVerifiedAt: item.last_verified_at ?? "",
  }));
}

export async function getAdminPlatformEmailTemplates(): Promise<AdminPlatformEmailTemplate[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_email_templates")
    .select("id,name,message_type,subject_template,body_json,active,updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((template) => ({
    id: template.id,
    name: template.name,
    messageType: template.message_type,
    subjectTemplate: template.subject_template,
    bodyJson: template.body_json,
    active: template.active,
    updatedAt: template.updated_at,
  }));
}

export async function getAdminAiSettings(): Promise<AdminAiSettings> {
  const fallback: AdminAiSettings = {
    enabled: false,
    provider: "deepseek",
    model: "deepseek-v4-flash",
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
    ragTopK: 8,
    systemPrompt: "Tu es William, assistant des compagnies de spectacle vivant. Reponds clairement, cite les sources disponibles et ne presente jamais une hypothese comme un fait.",
  };
  if (!hasSupabaseEnv()) return fallback;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("ai_settings").select("*").eq("id", true).maybeSingle();
  if (error || !data) return fallback;
  return {
    enabled: data.enabled,
    provider: data.provider,
    model: data.model,
    embeddingProvider: data.embedding_provider,
    embeddingModel: data.embedding_model,
    ragTopK: data.rag_top_k,
    systemPrompt: data.system_prompt,
  };
}

export async function getAdminRagDocuments(): Promise<AdminRagDocument[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id,title,content,source_type,source_url,active,embedding,updated_at")
    .is("company_id", null)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((document) => ({
    id: document.id,
    title: document.title,
    content: document.content,
    sourceType: document.source_type,
    sourceUrl: document.source_url ?? "",
    active: document.active,
    embedded: Boolean(document.embedding),
    updatedAt: document.updated_at,
  }));
}

export async function getAdminAiAccounts(): Promise<AdminAiAccount[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_ai_accounts");
  if (error || !data) return [];
  return data.map((account) => ({
    userId: account.user_id,
    email: account.email ?? "",
    fullName: account.full_name,
    companyId: account.company_id,
    companyName: account.company_name,
    companyEnabled: account.company_ai_enabled,
    userEnabled: account.user_ai_enabled,
    isSuperAdmin: account.is_super_admin,
    isFounder: account.is_founder,
    role: account.role,
    monthlyQuota: account.monthly_quota,
    monthlyUsed: account.monthly_used,
    accountMonthlyUsed: account.account_monthly_used,
    bonusBalance: account.bonus_balance,
  }));
}

export async function getAdminWilliamQuestionEvents(days = 30, limit = 500): Promise<AdminWilliamQuestionEvent[]> {
  if (!hasSupabaseEnv()) return [];
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("william_question_events")
    .select("id,question_excerpt,topic,request_kind,answered,out_of_scope,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 2000));
  if (error || !data) return [];
  return data.map((event) => ({
    id: event.id,
    questionExcerpt: event.question_excerpt,
    topic: event.topic,
    requestKind: event.request_kind,
    answered: event.answered,
    outOfScope: event.out_of_scope,
    createdAt: event.created_at,
  }));
}

export function getAiProviderReadiness(): AiProviderReadiness {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mistral: Boolean(process.env.MISTRAL_API_KEY),
  };
}
