import "server-only";
import type Stripe from "stripe";
import { getStripePriceId, type StripePlanCode } from "@/lib/stripe/plans";
import { getStripe, hasStripeWebhookEnv } from "@/lib/stripe/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";

export function isValidSubscriptionPrice(price: Stripe.Price, planCode: StripePlanCode) {
  if (!price.active || price.type !== "recurring" || price.recurring?.interval !== "month"
    || price.recurring.interval_count !== 1 || price.currency !== "eur" || price.unit_amount === null
    || price.unit_amount <= 0 || price.billing_scheme !== "per_unit" || price.recurring.usage_type !== "licensed"
    || price.transform_quantity || price.custom_unit_amount || price.tax_behavior === "exclusive") return false;
  return planCode !== "beta" || price.unit_amount === 1999;
}

export async function getBetaCheckoutOffer() {
  const unavailable = (message: string) => ({ ready: false, amount: null, currency: "eur" as const,
    interval: "month" as const, displayPrice: null, message });
  const priceId = getStripePriceId("beta");
  if (!hasStripeWebhookEnv() || !hasSupabaseAdminEnv() || !priceId) {
    return unavailable("Le paiement n’est pas encore disponible. Votre compte est conservé ; contactez l’équipe TaDiff.");
  }
  try {
    const price = await getStripe().prices.retrieve(priceId);
    if (!isValidSubscriptionPrice(price, "beta")) return unavailable("L’offre de paiement doit être vérifiée par l’équipe TaDiff.");
    const amount = price.unit_amount! / 100;
    return { ready: true, amount, currency: "eur" as const, interval: "month" as const,
      displayPrice: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount), message: null };
  } catch {
    return unavailable("Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.");
  }
}
