import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateShowBudget,
  defaultShowBudgetProfile,
  profitabilityAt,
} from "../../lib/show-budget.ts";

test("calcule le cout charge de creation et le seuil de rentabilite en cession", () => {
  const profile = structuredClone(defaultShowBudgetProfile);
  profile.personnel = [{
    id: "actor",
    label: "Comedien",
    group: "plateau",
    active: true,
    count: 2,
    rehearsalServices: 10,
    rehearsalGrossRate: 100,
    performanceGrossRate: 150,
    chargeRate: 0.5,
  }];
  profile.cessionFee = 2000;
  profile.authorRightsPercent = 0;
  profile.sacdContributionPercent = 0;
  profile.overheadPercent = 0;
  profile.contingencyPercent = 0;

  const summary = calculateShowBudget(profile, [
    { id: "decor", showId: "show", kind: "expense", category: "scenography", label: "Decor", amount: 1000, scope: "creation", sortOrder: 0 },
    { id: "travel", showId: "show", kind: "expense", category: "touring", label: "Transport", amount: 200, scope: "performance", sortOrder: 1 },
  ]);

  assert.equal(summary.creationCost, 4000);
  assert.equal(summary.performanceCost, 650);
  assert.equal(summary.contributionPerPerformance, 1350);
  assert.equal(summary.breakEvenPerformances, 3);
  assert.equal(profitabilityAt(summary, 3), 50);
});

test("calcule le public necessaire pour une location de salle", () => {
  const profile = structuredClone(defaultShowBudgetProfile);
  profile.personnel = [];
  profile.exploitationMode = "rental";
  profile.venueRental = 1000;
  profile.averageTicketPrice = 20;
  profile.authorRightsPercent = 10;
  profile.sacdContributionPercent = 0;

  const summary = calculateShowBudget(profile, []);

  assert.equal(summary.audienceBreakEven, 56);
});
