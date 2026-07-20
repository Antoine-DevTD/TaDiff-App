"use server";

import { redirect } from "next/navigation";
import { requireManagerAccess } from "@/lib/supabase/access";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { aiCreditPacks, getAiCreditPriceId, isAiCreditPackCode, type AiCreditPackCode } from "@/lib/stripe/ai-credits";
import { getAppUrl, getStripe, hasStripeEnv } from "@/lib/stripe/server";

export async function createAiCreditCheckoutSession(packCode: AiCreditPackCode) {
  if (!isAiCreditPackCode(packCode)) redirect("/settings?aiCredits=invalid_pack");
  if (!hasStripeEnv() || !hasSupabaseAdminEnv()) redirect("/settings?aiCredits=missing_configuration");
  const accessError = await requireManagerAccess();
  if (accessError) redirect("/settings?aiCredits=forbidden");

  const priceId = getAiCreditPriceId(packCode);
  if (!priceId) redirect(`/settings?aiCredits=missing_price&pack=${packCode}`);

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/settings");
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", auth.user.id).single();
  if (!profile?.company_id) redirect("/settings?aiCredits=missing_company");

  const admin = getSupabaseAdminClient();
  const { data: company } = await admin.from("companies").select("id,name,email,stripe_customer_id,ai_enabled").eq("id", profile.company_id).single();
  if (!company) redirect("/settings?aiCredits=missing_company");
  if (!company.ai_enabled) redirect("/settings?aiCredits=ai_not_enabled");

  const stripe = getStripe();
  let customerId = company.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.user.email ?? company.email ?? undefined,
      name: company.name,
      metadata: { companyId: company.id },
    });
    customerId = customer.id;
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", company.id);
  }

  const pack = aiCreditPacks[packCode];
  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: company.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?aiCredits=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings?aiCredits=cancelled`,
    metadata: {
      purchaseType: "ai_credits",
      companyId: company.id,
      purchasedBy: auth.user.id,
      tokenAmount: String(pack.tokenAmount),
      packCode,
    },
  });
  if (!session.url) redirect("/settings?aiCredits=no_checkout_url");
  redirect(session.url);
}
