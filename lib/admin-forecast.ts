// Projection simple du MRR TaDiff (sans dependance externe).
// Historique approxime : une compagnie "active" contribue au MRR depuis son
// mois de creation. La prevision prolonge le rythme de nouveaux abonnements
// observe sur les 3 derniers mois.

import type { AdminCompany } from "@/lib/supabase/admin";

export type RevenuePoint = {
  label: string;
  monthKey: string;
  mrr: number;
  projected: boolean;
};

export type RevenueForecast = {
  points: RevenuePoint[];
  currentMrr: number;
  projectedMrr: number;
  monthlyNet: number;
};

const DEFAULT_PRICE = 19.99;

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const label = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildRevenueForecast(
  companies: AdminCompany[],
  { price = DEFAULT_PRICE, forecastMonths = 6 }: { price?: number; forecastMonths?: number } = {},
): RevenueForecast {
  const active = companies
    .filter((company) => company.billingStatus === "active")
    .map((company) => monthStart(new Date(company.createdAt)))
    .sort((a, b) => a.getTime() - b.getTime());

  const now = monthStart(new Date());
  const start = active.length ? active[0] : addMonths(now, -5);

  // Historique cumule
  const points: RevenuePoint[] = [];
  for (let cursor = new Date(start); cursor <= now; cursor = addMonths(cursor, 1)) {
    const end = addMonths(cursor, 1);
    const cumulative = active.filter((created) => created < end).length;
    points.push({
      label: monthLabel(cursor),
      monthKey: monthKey(cursor),
      mrr: Math.round(cumulative * price),
      projected: false,
    });
  }

  const currentMrr = points.length ? points[points.length - 1].mrr : 0;

  // Rythme moyen de nouveaux abonnements sur les 3 derniers mois
  const threeMonthsAgo = addMonths(now, -3);
  const recentNew = active.filter((created) => created >= threeMonthsAgo).length;
  const monthlyNet = recentNew / 3;

  let projectedCount = active.length;
  for (let i = 1; i <= forecastMonths; i += 1) {
    projectedCount += monthlyNet;
    const cursor = addMonths(now, i);
    points.push({
      label: monthLabel(cursor),
      monthKey: monthKey(cursor),
      mrr: Math.round(projectedCount * price),
      projected: true,
    });
  }

  const projectedMrr = points.length ? points[points.length - 1].mrr : 0;

  return { points, currentMrr, projectedMrr, monthlyNet };
}
