// William remains deterministic until an AI provider is connected. Every
// recommendation below is computed from actual company data.

import type { GrantOpportunity, Reminder, ShowDocument, TreasurySnapshot } from "@/types";

export type WilliamTip = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info" | "success";
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysUntil(date: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(date));
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildWilliamTips({
  reminders,
  grants,
  documents,
  treasury,
}: {
  reminders: Reminder[];
  grants: GrantOpportunity[];
  documents: ShowDocument[];
  treasury: TreasurySnapshot | null;
}): WilliamTip[] {
  const tips: WilliamTip[] = [];
  const overdue = reminders.filter((reminder) => daysUntil(reminder.dueDate) < 0);

  if (overdue.length > 0) {
    tips.push({
      id: "reminders-overdue",
      title: `${overdue.length} relance(s) en retard`,
      detail: "Traite-les en priorite pour ne pas perdre une date ou une reponse.",
      href: "/reminders",
      tone: "danger",
    });
  }

  const soonGrants = grants.filter((grant) => {
    if (grant.status === "Depose" || grant.status === "Attribue") return false;
    const days = daysUntil(grant.deadline);
    return days >= 0 && days <= 14;
  });

  if (soonGrants.length > 0) {
    tips.push({
      id: "grants-soon",
      title: `${soonGrants.length} subvention(s) a deposer sous 14 jours`,
      detail: "Verifie les pieces du dossier et prepare le depot depuis le radar.",
      href: "/subventions",
      tone: "warning",
    });
  }

  if (!treasury) {
    tips.push({
      id: "treasury-missing",
      title: "Solde de tresorerie non renseigne",
      detail: "Renseigne ton solde bancaire pour obtenir une projection et une date de risque fiables.",
      href: "/finances",
      tone: "warning",
    });
  }

  const missingDocs = documents.filter((document) => document.status === "Manquant").length;
  if (missingDocs > 0) {
    tips.push({
      id: "docs-missing",
      title: `${missingDocs} piece(s) de dossier manquante(s)`,
      detail: "Complete les dossiers spectacle pour etre pret a deposer ou a vendre.",
      href: "/shows",
      tone: "info",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "all-good",
      title: "Tout est sous controle",
      detail: "Aucune urgence detectee. Continue a alimenter tes dates et tes dossiers.",
      href: "/dashboard",
      tone: "success",
    });
  }

  return tips;
}
