import { defaultCostProfile } from "@/data/mock-data";
import type {
  CostProfile,
  PipelineDeal,
  ProfitabilityInput,
  ProfitabilityResult,
  ProfitabilityVerdict,
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
