import { defaultCostProfile } from "@/data/mock-data";
import type {
  CostProfile,
  FixedCost,
  GrantOpportunity,
  PipelineDeal,
  ProfitabilityInput,
  ProfitabilityResult,
  ProfitabilityVerdict,
  QuoteItem,
  Show,
} from "@/types";

export const strategicTagLabels = [
  "Festival emblematique",
  "Couverture presse",
  "Acheteurs invites",
  "Captation",
  "Subvention liee",
  "Lien tournee",
];

export function getShowCostProfile(show?: Show | null): CostProfile {
  return show?.costProfile ?? defaultCostProfile;
}

export function calculateProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const performanceCount = Math.max(input.performanceCount, 1);
  const costProfile = input.costProfile;
  const transportCost =
    input.distanceKm > 0 ? input.distanceKm * 2 * costProfile.transportPerKm : 150;
  const hotelCost = Math.max(input.hotelNights, 0) * costProfile.hotelPerNight;
  const salaries = costProfile.artistFees + costProfile.technicalFees;
  const socialCharges = salaries * costProfile.socialChargesRate;
  const fixedCost =
    transportCost + hotelCost + salaries + socialCharges + costProfile.rights + costProfile.production;
  const commissionCost = input.salePrice * costProfile.tourCommissionRate;
  const totalCost = (fixedCost + commissionCost) * performanceCount;
  const grossRevenue =
    input.salePrice * performanceCount + input.workshopRevenue + input.subsidyRevenue;
  const margin = grossRevenue - totalCost;
  const marginRate = totalCost > 0 ? (margin / totalCost) * 100 : 0;
  const breakEven = Math.ceil(
    costProfile.tourCommissionRate > 0
      ? fixedCost / (1 - costProfile.tourCommissionRate)
      : fixedCost,
  );
  const verdict = getProfitabilityVerdict({
    margin,
    marginRate,
    strategicTags: input.strategicTags,
  });

  return {
    breakEven,
    commissionCost,
    fixedCost,
    grossRevenue,
    margin,
    marginRate,
    totalCost,
    verdict,
    suggestions: buildProfitabilitySuggestions({
      breakEven,
      input,
      margin,
      performanceCount,
    }),
  };
}

export function buildDealProfitability({
  deal,
  show,
}: {
  deal: PipelineDeal;
  show?: Show | null;
}) {
  return calculateProfitability({
    salePrice: deal.value,
    performanceCount: 1,
    distanceKm: 180,
    hotelNights: 1,
    workshopRevenue: deal.commercialPackId === "pack-school" ? 800 : 0,
    subsidyRevenue: 0,
    strategicTags: deal.stage === "Negociation" ? ["Acheteurs invites"] : [],
    costProfile: getShowCostProfile(show),
  });
}

export function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("fr-FR")} EUR`;
}

export function getVerdictMeta(verdict: ProfitabilityVerdict) {
  if (verdict === "rentable") {
    return { label: "Rentable", tone: "success" as const };
  }

  if (verdict === "equilibre") {
    return { label: "Equilibree", tone: "warning" as const };
  }

  if (verdict === "strategique") {
    return { label: "Deficit strategique", tone: "warning" as const };
  }

  return { label: "Deficitaire", tone: "danger" as const };
}

export function getMonthlyFixedCostEquivalent(cost: FixedCost) {
  if (cost.frequency === "Annuel") return cost.amount / 12;
  if (cost.frequency === "Trimestriel") return cost.amount / 3;
  return cost.amount;
}

export function getMonthlyFixedCostsTotal(costs: FixedCost[]) {
  return Math.round(
    costs.reduce((total, cost) => total + getMonthlyFixedCostEquivalent(cost), 0),
  );
}

export function getAnnualFixedCostsTotal(costs: FixedCost[]) {
  return Math.round(getMonthlyFixedCostsTotal(costs) * 12);
}

export function getFixedCostSharePerPerformance({
  costs,
  targetPerformancesPerYear,
}: {
  costs: FixedCost[];
  targetPerformancesPerYear: number;
}) {
  const performances = Math.max(targetPerformancesPerYear, 1);
  return Math.ceil(getAnnualFixedCostsTotal(costs) / performances);
}

export function getDaysUntil(date: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(date));

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildTreasuryProjection({
  currentCash,
  fixedCosts,
  grants,
  quotes,
}: {
  currentCash: number;
  fixedCosts: FixedCost[];
  grants: GrantOpportunity[];
  quotes: QuoteItem[];
}) {
  const monthlyFixedCosts = getMonthlyFixedCostsTotal(fixedCosts);
  const expectedQuotes30 = getQuoteCashInflow(quotes, 30);
  const expectedQuotes60 = getQuoteCashInflow(quotes, 60);
  const expectedQuotes90 = getQuoteCashInflow(quotes, 90);
  const expectedGrants90 = grants
    .filter((grant) => grant.status === "Depose" || grant.status === "Attribue")
    .filter((grant) => getDaysUntil(grant.deadline) <= 90)
    .reduce((total, grant) => total + grant.amount, 0);
  const cash30 = currentCash + expectedQuotes30 - monthlyFixedCosts;
  const cash60 = currentCash + expectedQuotes60 - monthlyFixedCosts * 2;
  const cash90 = currentCash + expectedQuotes90 + expectedGrants90 - monthlyFixedCosts * 3;
  const averageNetBurn = Math.max(monthlyFixedCosts - expectedQuotes30, monthlyFixedCosts);
  const runwayDays = averageNetBurn > 0 ? Math.round((currentCash / averageNetBurn) * 30) : 365;
  const riskDate = addDays(new Date(), runwayDays);
  const status: "success" | "warning" | "danger" =
    cash90 >= 0 ? "success" : cash60 >= 0 ? "warning" : "danger";

  return {
    cash30,
    cash60,
    cash90,
    currentCash,
    expectedGrants90,
    expectedQuotes30,
    expectedQuotes60,
    expectedQuotes90,
    monthlyFixedCosts,
    riskDate,
    runwayDays,
    status,
  };
}

function getQuoteCashInflow(quotes: QuoteItem[], maxDays: number) {
  return quotes
    .filter((quote) => quote.dueDate && getDaysUntil(quote.dueDate) <= maxDays)
    .reduce((total, quote) => total + quote.depositDue + quote.balanceDue, 0);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getProfitabilityVerdict({
  margin,
  marginRate,
  strategicTags,
}: {
  margin: number;
  marginRate: number;
  strategicTags: string[];
}): ProfitabilityVerdict {
  if (margin > 0 && marginRate >= 5) return "rentable";
  if (margin >= 0) return "equilibre";
  if (strategicTags.length > 0) return "strategique";
  return "deficitaire";
}

function buildProfitabilitySuggestions({
  breakEven,
  input,
  margin,
  performanceCount,
}: {
  breakEven: number;
  input: ProfitabilityInput;
  margin: number;
  performanceCount: number;
}) {
  if (margin >= 0) {
    return ["Valider la date et verrouiller le devis avant de bloquer l'equipe."];
  }

  const suggestions = [`Monter le prix de cession a ${formatCurrency(breakEven)} minimum.`];

  if (input.workshopRevenue === 0) {
    suggestions.push("Ajouter un atelier ou une mediation pour 500 a 1 500 EUR.");
  }

  if (input.subsidyRevenue === 0) {
    suggestions.push("Rattacher une aide DRAC, Region ou fondation a cette date.");
  }

  if (performanceCount === 1) {
    suggestions.push("Negocier deux representations au meme lieu pour mutualiser les couts.");
  }

  suggestions.push("Si la date reste strategique, documenter le motif avant de signer.");
  return suggestions;
}
