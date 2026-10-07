"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { computeHasAccess } from "@/lib/supabase/access";
import { getAppUrl, getStripe, hasStripeWebhookEnv } from "@/lib/stripe/server";
import { getStripePriceId, isStripePlanCode, type StripePlanCode } from "@/lib/stripe/plans";
import { getStripeDatabase, rpcObject } from "@/lib/stripe/database";
import { isValidSubscriptionPrice } from "@/lib/stripe/offer";

export async function createStripeCheckoutSession(planCode: StripePlanCode) {
  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) redirect("/billing?stripe=missing_configuration");
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=/billing");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("company_id,role").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.company_id || !user.email_confirmed_at
    || (profile.role !== "owner" && profile.role !== "admin")) redirect("/billing?stripe=forbidden");
  const db = getStripeDatabase();
  const { data: company, error: companyError } = await db.from("companies")
    .select("id,billing_status,comped_until,stripe_customer_id,stripe_subscription_id").eq("id", profile.company_id).single();
  if (companyError || !company) redirect("/billing?stripe=unavailable");
  const destination = "/billing";
  if (!isStripePlanCode(planCode) || (company.billing_status === "pending_payment" && planCode !== "beta")) {
    redirect(`${destination}?stripe=invalid_price`);
  }
  if (company.billing_status === "active") redirect(`${destination}?stripe=existing_subscription`);
  if (company.billing_status === "comped" && computeHasAccess(company.billing_status, company.comped_until)) {
    redirect(`${destination}?stripe=offered_access`);
  }
  const priceId = getStripePriceId(planCode);
  if (!hasStripeWebhookEnv() || !priceId) redirect(`${destination}?stripe=missing_configuration`);

  let target = `${destination}?stripe=unavailable`;
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    if (!isValidSubscriptionPrice(price, planCode)) {
      target = `${destination}?stripe=invalid_price`;
    } else {
      const { data, error } = await db.rpc("prepare_stripe_checkout", {
        p_company_id: company.id, p_actor_id: user.id, p_plan_code: planCode, p_price_id: priceId,
      });
      const attempt = rpcObject(data);
      if (error) throw new Error("Checkout reservation failed");
      if (!attempt.ok || typeof attempt.attemptId !== "string") {
        const status = attempt.status === "existing_subscription" ? "existing_subscription"
          : attempt.status === "complimentary_access" ? "offered_access" : "unavailable";
        target = `${destination}?stripe=${status}`;
      } else {
        const attemptId = attempt.attemptId;
        // Check before customer creation as well: old uncertain requests require
        // reconciliation once the provider's idempotency retention has elapsed.
        if (!attempt.sessionId && (typeof attempt.createdAt !== "string" || !Number.isFinite(Date.parse(attempt.createdAt))
          || Date.now() - Date.parse(attempt.createdAt) > 23 * 60 * 60 * 1000)) throw new Error("Checkout reconciliation required");
        let customerId = typeof attempt.customerId === "string" ? attempt.customerId : null;
        if (!customerId) {
          const customer = await stripe.customers.create({
            // Immutable payload: a renamed company or changed email must not
            // invalidate a retry after a lost provider response. Checkout collects
            // the payer's email and billing details directly.
            metadata: { companyId: company.id },
          }, { idempotencyKey: `tadiff-customer-${company.id}` });
          const bound = await db.rpc("bind_stripe_checkout_customer", { p_attempt_id: attemptId, p_customer_id: customer.id });
          if (bound.error || !rpcObject(bound.data).ok) throw new Error("Customer association failed");
          customerId = customer.id;
        }
        const appUrl = getAppUrl();
        const session = typeof attempt.sessionId === "string"
          ? await stripe.checkout.sessions.retrieve(attempt.sessionId)
          : await stripe.checkout.sessions.create({
            mode: "subscription", customer: customerId, client_reference_id: company.id,
            line_items: [{ price: priceId, quantity: 1, tax_rates: [] }],
            automatic_tax: { enabled: false }, consent_collection: { terms_of_service: "required" },
            success_url: `${appUrl}${destination}?stripe=success`, cancel_url: `${appUrl}${destination}?stripe=cancelled`,
            metadata: { companyId: company.id, planCode, checkoutAttemptId: attemptId },
            subscription_data: { metadata: { companyId: company.id, planCode, checkoutAttemptId: attemptId } },
          }, { idempotencyKey: `tadiff-checkout-${attemptId}` });
        if (session.status === "complete") {
          target = `${destination}?stripe=success`;
        } else if (session.status === "expired") {
          const expired = await db.rpc("expire_stripe_checkout", { p_attempt_id: attemptId, p_session_id: session.id });
          if (expired.error || !rpcObject(expired.data).ok) throw new Error("Checkout expiry failed");
          target = `${destination}?stripe=expired`;
        } else if (session.url && session.status === "open") {
          const saved = await db.rpc("finish_stripe_checkout", {
            p_attempt_id: attemptId, p_session_id: session.id, p_url: session.url,
            p_expires_at: new Date(session.expires_at * 1000).toISOString(),
          });
          if (saved.error || !rpcObject(saved.data).ok) throw new Error("Checkout persistence failed");
          target = session.url;
        }
      }
    }
  } catch {
    target = `${destination}?stripe=unavailable`;
  }
  redirect(target);
}
