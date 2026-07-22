import type {
  ShowBudgetItem,
  ShowBudgetPersonnel,
  ShowBudgetProfile,
  ShowBudgetSummary,
} from "@/types";

export const defaultTheatreBudgetPersonnel: ShowBudgetPersonnel[] = [
  { id: "actors", label: "Comédien ou comédienne", group: "plateau", active: true, count: 1, rehearsalServices: 15, rehearsalGrossRate: 84, performanceGrossRate: 119.42, chargeRate: 0.52 },
  { id: "director", label: "Metteur ou metteuse en scène", group: "creation", active: true, count: 1, rehearsalServices: 15, rehearsalGrossRate: 0, performanceGrossRate: 0, chargeRate: 0.52 },
  { id: "assistant-director", label: "Assistant ou assistante mise en scène", group: "creation", active: false, count: 1, rehearsalServices: 15, rehearsalGrossRate: 0, performanceGrossRate: 0, chargeRate: 0.52 },
  { id: "stage-manager", label: "Régisseur ou régisseuse", group: "technique", active: false, count: 1, rehearsalServices: 5, rehearsalGrossRate: 0, performanceGrossRate: 0, chargeRate: 0.48 },
];

export const defaultShowBudgetProfile: ShowBudgetProfile = {
  showId: "",
  convention: "Spectacle vivant privé - IDCC 3090",
  rateSourceUrl: "https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000053721738",
  rateEffectiveDate: "2025-09-01",
  performancesTarget: 20,
  exploitationMode: "cession",
  cessionFee: 2500,
  venueRental: 0,
  minimumGuarantee: 0,
  companySharePercent: 50,
  averageTicketPrice: 18,
  venueCapacity: 150,
  expectedOccupancyPercent: 60,
  rightsTerritory: "outside_paris",
  authorRightsPercent: 10.5,
  sacdContributionPercent: 2.1,
  directorRightsPercent: 0,
  musicRightsPercent: 0,
  overheadPercent: 5,
  contingencyPercent: 5,
  cessionMarginPercent: 15,
  personnel: defaultTheatreBudgetPersonnel,
};

const loadedCost = (person: ShowBudgetPersonnel, rate: number, units: number) =>
  (person.active ? 1 : 0) * person.count * units * rate * (1 + person.chargeRate);

export function calculateShowBudget(profile: ShowBudgetProfile, items: ShowBudgetItem[]): ShowBudgetSummary {
  const expenses = items.filter((item) => item.kind === "expense");
  const revenues = items.filter((item) => item.kind === "revenue");
  const creationPersonnel = profile.personnel.reduce(
    (sum, person) => sum + loadedCost(person, person.rehearsalGrossRate, person.rehearsalServices), 0,
  );
  const performancePersonnel = profile.personnel.reduce(
    (sum, person) => sum + loadedCost(person, person.performanceGrossRate, 1), 0,
  );
  const creationExpenses = expenses.filter((item) => item.scope !== "performance").reduce((sum, item) => sum + item.amount, 0);
  const performanceExpenses = expenses.filter((item) => item.scope === "performance").reduce((sum, item) => sum + item.amount, 0);
  const securedFunding = revenues.reduce((sum, item) => sum + item.amount, 0);
  const creationBase = creationPersonnel + creationExpenses;
  const overhead = creationBase * (profile.overheadPercent / 100);
  const contingency = (creationBase + overhead) * (profile.contingencyPercent / 100);
  const creationCost = creationBase + overhead + contingency;
  const expectedAttendance = Math.round(profile.venueCapacity * (profile.expectedOccupancyPercent / 100));
  const expectedBoxOffice = expectedAttendance * profile.averageTicketPrice;
  const rightsRate = (profile.authorRightsPercent + profile.sacdContributionPercent + profile.directorRightsPercent + profile.musicRightsPercent) / 100;
  const rightsBase = Math.max(expectedBoxOffice, profile.exploitationMode === "cession" ? profile.cessionFee : 0);
  const rightsPerPerformance = rightsBase * rightsRate;
  const rentalCost = profile.exploitationMode === "rental" ? profile.venueRental : 0;
  const performanceCost = performancePersonnel + performanceExpenses + rightsPerPerformance + rentalCost;
  const performanceIncome = profile.exploitationMode === "cession"
    ? profile.cessionFee
    : profile.exploitationMode === "revenue_share"
      ? Math.max(expectedBoxOffice * (profile.companySharePercent / 100), profile.minimumGuarantee)
      : expectedBoxOffice;
  const contributionPerPerformance = performanceIncome - performanceCost;
  const remainingCreationCost = Math.max(creationCost - securedFunding, 0);
  const breakEvenPerformances = contributionPerPerformance > 0
    ? Math.ceil(remainingCreationCost / contributionPerPerformance)
    : null;
  const amortizedCreation = remainingCreationCost / Math.max(profile.performancesTarget, 1);
  const recommendedCessionFee = (performancePersonnel + performanceExpenses + rightsPerPerformance + amortizedCreation)
    * (1 + profile.cessionMarginPercent / 100);
  const retainedTicketPrice = profile.averageTicketPrice * Math.max(1 - rightsRate, 0);
  const audienceBreakEven = retainedTicketPrice > 0
    ? Math.ceil((performancePersonnel + performanceExpenses + rentalCost) / retainedTicketPrice)
    : null;

  return {
    creationCost, creationPersonnel, creationExpenses, securedFunding, remainingCreationCost,
    performancePersonnel, performanceExpenses, rightsPerPerformance, performanceCost,
    performanceIncome, contributionPerPerformance, expectedAttendance, expectedBoxOffice,
    breakEvenPerformances, audienceBreakEven, recommendedCessionFee,
  };
}

export function profitabilityAt(summary: ShowBudgetSummary, performances: number) {
  return -summary.remainingCreationCost + summary.contributionPerPerformance * performances;
}
