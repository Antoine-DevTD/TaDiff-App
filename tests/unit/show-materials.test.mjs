import assert from "node:assert/strict";
import test from "node:test";
import { computeMaterialPurchaseCost } from "../../lib/show-material-calculations.ts";

test("calcule uniquement la quantité manquante quand un achat est nécessaire", () => {
  assert.equal(computeMaterialPurchaseCost({ quantityOwned: 2, unitCost: 12.5 }, { quantityNeeded: 5, status: "to_buy" }), 37.5);
});

test("ne produit pas de coût d’achat si le matériel est prêt", () => {
  assert.equal(computeMaterialPurchaseCost({ quantityOwned: 0, unitCost: 12.5 }, { quantityNeeded: 5, status: "ready" }), 0);
});

test("ne produit pas de coût négatif lorsque le stock couvre le besoin", () => {
  assert.equal(computeMaterialPurchaseCost({ quantityOwned: 8, unitCost: 12.5 }, { quantityNeeded: 5, status: "to_buy" }), 0);
});
