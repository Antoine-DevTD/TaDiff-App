import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getStripe, hasStripeWebhookEnv } from "@/lib/stripe/server";

export const runtime = "nodejs";

type BillingSync = {
  billing_status: "trial" | "active" | "comped" | "past_due" | "cancelled";
  billing_notes: string;
  plan_code?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
};

export async function POST(request: Request) {
  if (!hasStripeWebhookEnv() || !hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await syncCheckoutSession(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object, "cancelled");
      break;
    case "invoice.payment_succeeded":
      await syncInvoice(event.data.object, "active");
      break;
    case "invoice.payment_failed":
      await syncInvoice(event.data.object, "past_due");
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId ?? session.client_reference_id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!companyId) return;

  await updateCompanyBilling(companyId, {
    billing_status: "active",
    billing_notes: "Stripe checkout complete.",
    plan_code: session.metadata?.planCode || "beta",
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripe_subscription_id: subscriptionId ?? null,
  });
}

async function syncInvoice(invoice: Stripe.Invoice, status: BillingSync["billing_status"]) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (subscriptionId) {
    await updateCompanyBillingBySubscription(subscriptionId, {
      billing_status: status,
      billing_notes: status === "active" ? "Paiement Stripe recu." : "Paiement Stripe en echec.",
    });
    return;
  }

  if (customerId) {
    await updateCompanyBillingByCustomer(customerId, {
      billing_status: status,
      billing_notes: status === "active" ? "Paiement Stripe recu." : "Paiement Stripe en echec.",
    });
  }
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  forcedStatus?: BillingSync["billing_status"],
) {
  const companyId = subscription.metadata?.companyId;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);
  const billingStatus = forcedStatus ?? mapSubscriptionStatus(subscription.status);
  const sync: BillingSync = {
    billing_status: billingStatus,
    billing_notes: `Stripe subscription ${subscription.status}.`,
    plan_code: subscription.metadata?.planCode || "beta",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    stripe_current_period_end: currentPeriodEnd,
  };

  if (companyId) {
    await updateCompanyBilling(companyId, sync);
    return;
  }

  await updateCompanyBillingByCustomer(customerId, sync);
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status): BillingSync["billing_status"] {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "cancelled";
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscription = invoiceWithSubscription.subscription;

  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0] as Stripe.SubscriptionItem & {
    current_period_end?: number | null;
  };

  if (!item.current_period_end) return null;
  return new Date(item.current_period_end * 1000).toISOString();
}

async function updateCompanyBilling(companyId: string, sync: BillingSync) {
  const admin = getSupabaseAdminClient();
  await admin.from("companies").update(sync).eq("id", companyId);
}

async function updateCompanyBillingByCustomer(customerId: string, sync: BillingSync) {
  const admin = getSupabaseAdminClient();
  await admin.from("companies").update(sync).eq("stripe_customer_id", customerId);
}

async function updateCompanyBillingBySubscription(subscriptionId: string, sync: BillingSync) {
  const admin = getSupabaseAdminClient();
  await admin.from("companies").update(sync).eq("stripe_subscription_id", subscriptionId);
}
