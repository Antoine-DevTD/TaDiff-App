import "server-only";
import type Stripe from "stripe";
import { getStripeDatabase, rpcObject } from "@/lib/stripe/database";
import { getStripePriceId, stripePlanCodes } from "@/lib/stripe/plans";
import { isValidSubscriptionPrice } from "@/lib/stripe/offer";

function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacy = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  return objectId(invoice.parent?.subscription_details?.subscription) ?? objectId(legacy.subscription);
}

export async function processStripeEvent(event: Stripe.Event, stripe: Stripe) {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if ((key.startsWith("sk_live_") && !event.livemode) || (key.startsWith("sk_test_") && event.livemode)) return;
  const db = getStripeDatabase();
  let subscriptionId: string | null = null;
  let sessionCompanyId: string | null = null;
  let sessionCustomerId: string | null = null;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid") return;
      if (session.metadata?.purchaseType === "ai_credits") {
        const companyId = session.metadata.companyId ?? session.client_reference_id;
        const tokenAmount = Number(session.metadata.tokenAmount);
        if (!companyId || !Number.isSafeInteger(tokenAmount) || tokenAmount <= 0) return;
        const result = await db.rpc("grant_ai_credit_purchase", {
          p_company_id: companyId, p_purchased_by: session.metadata.purchasedBy || null,
          p_token_amount: tokenAmount, p_amount_paid: session.amount_total ?? 0,
          p_currency: session.currency ?? "eur", p_stripe_checkout_session_id: session.id,
        });
        if (result.error) throw new Error("Credit synchronization failed");
        return;
      }
      if (session.mode !== "subscription") return;
      subscriptionId = objectId(session.subscription);
      sessionCompanyId = session.metadata?.companyId ?? session.client_reference_id;
      sessionCustomerId = objectId(session.customer);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      subscriptionId = event.data.object.id;
      break;
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      subscriptionId = invoiceSubscriptionId(event.data.object);
      break;
    default: return;
  }
  if (!subscriptionId) return;
  // Reconcile the current object. An old failed invoice must not overwrite a
  // subsequently successful payment, or resurrect a cancelled subscription.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  const customerId = objectId(subscription.customer);
  if (!customerId || (sessionCustomerId && customerId !== sessionCustomerId)) return;
  const companyId = subscription.metadata.companyId || sessionCompanyId;
  if (sessionCompanyId && subscription.metadata.companyId && sessionCompanyId !== subscription.metadata.companyId) return;
  const query = db.from("companies").select("id,billing_status,plan_code,stripe_customer_id,stripe_subscription_id,stripe_price_id");
  const { data: company, error } = await (companyId ? query.eq("id", companyId) : query.eq("stripe_customer_id", customerId)).maybeSingle();
  if (error) throw new Error("Company lookup failed");
  if (!company || company.stripe_customer_id !== customerId
    || (company.stripe_subscription_id && company.stripe_subscription_id !== subscription.id)) return;
  const item = subscription.items.data[0];
  if (!item || (!company.stripe_subscription_id && (subscription.items.data.length !== 1 || item.quantity !== 1))) return;
  const price = item.price;
  const planCode = stripePlanCodes.find((plan) => getStripePriceId(plan) === price.id);
  const existingPrice = company.stripe_subscription_id === subscription.id && company.stripe_price_id === price.id;
  if (!existingPrice && (!planCode || !isValidSubscriptionPrice(price, planCode))) return;
  if (company.billing_status === "pending_payment" && (planCode !== "beta" || !isValidSubscriptionPrice(price, "beta"))) return;
  const invoice = typeof subscription.latest_invoice === "string"
    ? await stripe.invoices.retrieve(subscription.latest_invoice) : subscription.latest_invoice;
  const paymentConfirmed = Boolean(invoice && invoice.status === "paid" && invoice.amount_paid > 0
    && invoiceSubscriptionId(invoice) === subscription.id && objectId(invoice.customer) === customerId);
  let status = "pending_payment";
  if (subscription.status === "active" && paymentConfirmed) status = "active";
  else if (["past_due", "unpaid", "incomplete", "paused"].includes(subscription.status)) status = "past_due";
  else if (["canceled", "incomplete_expired"].includes(subscription.status)) status = "cancelled";
  const result = await db.rpc("apply_stripe_billing_event", {
    p_event_id: event.id, p_event_created: event.created, p_event_type: event.type,
    p_company_id: company.id, p_customer_id: customerId, p_subscription_id: subscription.id,
    p_price_id: price.id, p_plan_code: planCode ?? company.plan_code,
    p_status: status, p_payment_confirmed: paymentConfirmed,
    p_checkout_attempt_id: subscription.metadata.checkoutAttemptId || null,
    p_current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
  });
  if (result.error || !rpcObject(result.data).ok) throw new Error("Billing synchronization failed");
}
