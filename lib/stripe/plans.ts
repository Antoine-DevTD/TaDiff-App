export const stripePlanCodes = ["beta", "solo", "pro", "studio"] as const;

export type StripePlanCode = (typeof stripePlanCodes)[number];

type StripePlanConfig = {
  envKey: string;
  label: string;
  planCode: StripePlanCode;
};

export const stripePlans: Record<StripePlanCode, StripePlanConfig> = {
  beta: {
    envKey: "STRIPE_PRICE_BETA_MONTHLY",
    label: "Beta 19,99 EUR / mois",
    planCode: "beta",
  },
  solo: {
    envKey: "STRIPE_PRICE_SOLO_MONTHLY",
    label: "Solo",
    planCode: "solo",
  },
  pro: {
    envKey: "STRIPE_PRICE_PRO_MONTHLY",
    label: "Pro",
    planCode: "pro",
  },
  studio: {
    envKey: "STRIPE_PRICE_STUDIO_MONTHLY",
    label: "Studio",
    planCode: "studio",
  },
};

export function isStripePlanCode(value: string): value is StripePlanCode {
  return stripePlanCodes.includes(value as StripePlanCode);
}

export function getStripePriceId(planCode: StripePlanCode) {
  return process.env[stripePlans[planCode].envKey] || null;
}

export function hasStripePrice(planCode: StripePlanCode) {
  return Boolean(getStripePriceId(planCode));
}
