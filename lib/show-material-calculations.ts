export function computeMaterialPurchaseCost(item: { quantityOwned: number; unitCost: number }, requirement: { quantityNeeded: number; status: string }) {
  const missing = requirement.status === "to_buy" ? Math.max(0, requirement.quantityNeeded - item.quantityOwned) : 0;
  return Math.round(missing * item.unitCost * 100) / 100;
}
