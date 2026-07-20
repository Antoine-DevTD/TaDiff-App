export const aiCreditPackCodes = ["starter", "boost", "company"] as const;

export type AiCreditPackCode = (typeof aiCreditPackCodes)[number];

export const aiCreditPacks: Record<AiCreditPackCode, { label: string; tokenAmount: number; displayPrice: string; envKey: string }> = {
  starter: { label: "100 000 credits", tokenAmount: 100_000, displayPrice: "2,99 EUR", envKey: "STRIPE_PRICE_AI_100K" },
  boost: { label: "500 000 credits", tokenAmount: 500_000, displayPrice: "9,99 EUR", envKey: "STRIPE_PRICE_AI_500K" },
  company: { label: "2 000 000 credits", tokenAmount: 2_000_000, displayPrice: "29,99 EUR", envKey: "STRIPE_PRICE_AI_2M" },
};

export function isAiCreditPackCode(value: string): value is AiCreditPackCode {
  return aiCreditPackCodes.includes(value as AiCreditPackCode);
}
export function getAiCreditPriceId(code: AiCreditPackCode) {
  return process.env[aiCreditPacks[code].envKey] || null;
}

export function hasAiCreditPrice(code: AiCreditPackCode) {
  return Boolean(getAiCreditPriceId(code));
}
