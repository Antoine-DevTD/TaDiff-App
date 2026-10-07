import type { AdminCompany } from "@/lib/supabase/admin";

export type AdminCompanyMember = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  lastActivity: string | null;
  lastLogin: string | null;
};

export type AdminSupervisedCompany = AdminCompany & {
  hasAccess: boolean;
  members: AdminCompanyMember[];
};

export type AdminCompanySupervisionSnapshot =
  | { status: "ready"; companies: AdminSupervisedCompany[]; canViewAccess: boolean; loadedAt: string }
  | { status: "error"; message: string };

export function normalizeSupervisionSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
}

export function memberMatchesSearch(member: AdminCompanyMember, query: string) {
  const normalized = normalizeSupervisionSearch(query);
  return normalized !== "" && normalizeSupervisionSearch(`${member.fullName} ${member.email}`).includes(normalized);
}

export function companyMatchesSearch(company: AdminSupervisedCompany, query: string) {
  const normalized = normalizeSupervisionSearch(query);
  return !normalized || normalizeSupervisionSearch(company.name).includes(normalized)
    || company.members.some((member) => memberMatchesSearch(member, query));
}

export function getSupervisionBillingLabel(status: AdminCompany["billingStatus"]) {
  const labels = {
    pending_payment: "En attente de paiement",
    trial: "Essai",
    active: "Abonnement actif",
    comped: "Offert",
    past_due: "Paiement en retard",
    cancelled: "Résilié",
  };
  return labels[status] ?? "Statut inconnu";
}

export function getSupervisionRoleLabel(role: string) {
  return ({ owner: "Responsable", admin: "Administrateur", member: "Membre", readonly: "Lecture seule" } as Record<string, string>)[role] ?? "Rôle non renseigné";
}
