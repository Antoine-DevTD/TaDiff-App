import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingStatus } from "@/lib/supabase/access";

export type AdminCompany = {
  id: string;
  name: string;
  billingStatus: BillingStatus;
  planCode: string;
  compedUntil: string | null;
  billingNotes: string;
  createdAt: string;
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
