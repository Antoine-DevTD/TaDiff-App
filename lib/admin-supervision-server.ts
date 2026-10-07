import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/env";
import { computeHasAccess } from "@/lib/supabase/access";
import { getPlatformAdminAccess } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminCompanySupervisionSnapshot, AdminSupervisedCompany } from "@/lib/admin-supervision";
import type { Database } from "@/types/database.types";

type PageResult<T> = { data: T[] | null; error: unknown; count: number | null };
type CompanyRow = Database["public"]["Functions"]["admin_list_companies"]["Returns"][number];
type MemberRow = Database["public"]["Functions"]["admin_list_company_members"]["Returns"][number];

// RPC results use the same Data API row cap as tables. Missing pages must never
// make a company appear empty or reduce the member totals in supervision.
export async function collectSupervisionPages<T>(read: (from: number, to: number) => PromiseLike<PageResult<T>>, key: (row: T) => string): Promise<T[]> {
  const rows: T[] = [];
  const ids = new Set<string>();
  let total: number | null = null;
  do {
    const result = await read(rows.length, rows.length + 499);
    if (result.error || !result.data || result.count === null || !Number.isSafeInteger(result.count) || result.count < 0) throw new Error("supervision_read_failed");
    if (total !== null && total !== result.count) throw new Error("supervision_changed_during_read");
    total = result.count;
    for (const row of result.data) {
      const id = key(row);
      if (!id || ids.has(id)) throw new Error("supervision_duplicate_page");
      ids.add(id);
      rows.push(row);
    }
    if (rows.length > total || (rows.length < total && result.data.length === 0)) throw new Error("supervision_incomplete");
  } while (rows.length < total);
  return rows;
}

export function assembleCompanySupervision(companies: CompanyRow[], members: MemberRow[], canViewAccess: boolean): AdminSupervisedCompany[] {
  const companyIds = new Set(companies.map((company) => company.id));
  const membersByCompany = new Map<string, MemberRow[]>();
  for (const member of members) {
    if (!companyIds.has(member.company_id)) throw new Error("supervision_company_changed");
    const team = membersByCompany.get(member.company_id);
    if (team) team.push(member); else membersByCompany.set(member.company_id, [member]);
  }
  return companies.map((company) => {
    const companyMembers = membersByCompany.get(company.id) ?? [];
    if (companyMembers.length !== company.member_count) throw new Error("supervision_members_changed");
    return {
      id: company.id, name: company.name, billingStatus: company.billing_status,
      planCode: company.plan_code, compedUntil: company.comped_until, billingNotes: company.billing_notes ?? "",
      createdAt: company.created_at, ownerName: company.owner_name ?? "", ownerEmail: company.owner_email ?? "",
      memberCount: company.member_count, showCount: company.show_count, contactCount: company.contact_count,
      dealCount: company.deal_count, lastActivity: company.last_activity,
      hasAccess: computeHasAccess(company.billing_status, company.comped_until),
      members: companyMembers.map((member) => ({
        userId: member.user_id, fullName: member.full_name ?? "", email: member.email ?? "", role: member.role ?? "",
        createdAt: member.created_at, lastActivity: canViewAccess ? member.last_activity : null,
        lastLogin: canViewAccess ? member.last_login : null,
      })).sort((first, second) => {
        const rank = (role: string) => ({ owner: 0, admin: 1, member: 2, readonly: 3 } as Record<string, number>)[role] ?? 4;
        return rank(first.role) - rank(second.role) || first.fullName.localeCompare(second.fullName, "fr");
      }),
    };
  });
}

export async function readCompanySupervision(db: SupabaseClient<Database>, canViewAccess: boolean) {
  const [companies, members] = await Promise.all([
    collectSupervisionPages<CompanyRow>((from, to) => db.rpc("admin_list_companies", {}, { count: "exact" }).order("created_at", { ascending: false }).order("id").range(from, to), (row) => row.id),
    collectSupervisionPages<MemberRow>((from, to) => db.rpc("admin_list_company_members", {}, { count: "exact" }).order("company_id").order("user_id").range(from, to), (row) => row.user_id),
  ]);
  return assembleCompanySupervision(companies, members, canViewAccess);
}

export async function getAdminCompanySupervision(): Promise<AdminCompanySupervisionSnapshot> {
  if (!hasSupabaseEnv()) return { status: "error", message: "La supervision des compagnies nécessite une connexion à la base de données." };
  try {
    const access = await getPlatformAdminAccess();
    if (!access.isSuperAdmin && !access.permissions.includes("view_companies")) return { status: "error", message: "Le droit de consulter les compagnies est nécessaire." };
    const canViewAccess = access.isSuperAdmin || access.permissions.includes("view_access");
    const companies = await readCompanySupervision(await getSupabaseServerClient(), canViewAccess);
    return { status: "ready", companies, canViewAccess, loadedAt: new Date().toISOString() };
  } catch {
    return { status: "error", message: "Les compagnies et leurs membres n’ont pas pu être chargés au complet. Actualisez pour réessayer. Si le problème persiste, vérifiez la mise à jour de la base de données." };
  }
}
