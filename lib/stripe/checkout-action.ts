"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl, getStripe, hasStripeEnv } from "@/lib/stripe/server";
import { getStripePriceId, isStripePlanCode, type StripePlanCode } from "@/lib/stripe/plans";

export async function createStripeCheckoutSession(planCode: StripePlanCode) {
  if (!isStripePlanCode(planCode)) {
    redirect("/billing?stripe=invalid_plan");
  }

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    redirect("/billing?stripe=missing_supabase");
  }

  if (!hasStripeEnv()) {
    redirect("/billing?stripe=missing_stripe");
  }

  const priceId = getStripePriceId(planCode);

  if (!priceId) {
    redirect(`/billing?stripe=missing_price&plan=${planCode}`);
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect("/billing?stripe=missing_company");
  }

  const admin = getSupabaseAdminClient();
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id,name,email,stripe_customer_id")
    .eq("id", profile.company_id)
    .single();

  if (companyError || !company) {
    redirect("/billing?stripe=missing_company");
  }

  const stripe = getStripe();
  let customerId = company.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? company.email ?? undefined,
      name: company.name,
      metadata: {
        companyId: company.id,
      },
    });

    customerId = customer.id;

    await admin
      .from("companies")
      .update({
        stripe_customer_id: customerId,
        billing_notes: `Stripe customer cree en mode test pour le plan ${planCode}.`,
      })
      .eq("id", company.id);
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: company.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?stripe=cancelled`,
    metadata: {
      companyId: company.id,
      planCode,
    },
    subscription_data: {
      metadata: {
        companyId: company.id,
        planCode,
      },
    },
  });

  if (!session.url) {
    redirect("/billing?stripe=no_checkout_url");
  }

  redirect(session.url);
}
