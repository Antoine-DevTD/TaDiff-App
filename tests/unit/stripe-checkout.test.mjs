import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import Stripe from "stripe";

const companyId = "12345678-1234-4123-8123-123456789013";
const userId = "12345678-1234-4123-8123-123456789014";
const attemptId = "12345678-1234-4123-8123-123456789015";
const env = { STRIPE_SECRET_KEY: "sk_test_unit_only", STRIPE_PRICE_BETA_MONTHLY: "price_beta", STRIPE_WEBHOOK_SECRET: "unit_secret" };
function load(file, dependencies = {}, variables = env) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, process: { env: variables }, Date, Intl, URL,
    require: (name) => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; } });
  return exports;
}

function harness(options = {}) {
  const calls = [];
  const customerRequests = new Map();
  const price = { id: "price_beta", active: true, type: "recurring", currency: "eur", unit_amount: 1999,
    billing_scheme: "per_unit", tax_behavior: "inclusive", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" }, ...options.price };
  const company = { id: companyId, name: "Compagnie QA", email: "qa@example.invalid", billing_status: "pending_payment", plan_code: "beta",
    comped_until: null, stripe_customer_id: "cus_company", stripe_subscription_id: null, stripe_price_id: null, ...options.company };
  const invoice = { id: "in_paid", status: "paid", amount_paid: 1999, customer: "cus_company",
    parent: { type: "subscription_details", subscription_details: { subscription: "sub_company" } }, ...options.invoice };
  const subscription = { id: "sub_company", status: "active", customer: "cus_company", metadata: { companyId, checkoutAttemptId: attemptId },
    items: { data: [{ price, quantity: 1, current_period_end: 1800000000 }] }, latest_invoice: invoice, ...options.subscription };
  const session = { id: "cs_open", status: "open", url: "https://checkout.stripe.com/c/pay/unit", expires_at: 1800000000, ...options.session };
  const rpcObject = (data) => data && typeof data === "object" ? data : {};
  const db = {
    from(table) {
      const query = { select: () => query, eq(column, value) { calls.push({ type: "filter", table, column, value }); return query; },
        single: async () => ({ data: table === "profiles" ? { company_id: companyId, role: options.role ?? "owner" } : company, error: options.readError ?? null }),
        maybeSingle: async () => query.single() };
      return query;
    },
    auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: userId, email: "qa@example.invalid", email_confirmed_at: options.unconfirmed ? null : "2026-10-04" } }, error: null }) },
    async rpc(name, args) {
      calls.push({ type: "rpc", name, args });
      if (options.rpcError === name) return { data: null, error: { message: "private database error" } };
      return { data: name === "prepare_stripe_checkout" ? {
        ok: true, attemptId, customerId: company.stripe_customer_id, sessionId: options.existingSession ? "cs_open" : null,
        createdAt: new Date().toISOString(), ...options.attempt,
      } : { ok: true }, error: null };
    },
  };
  const stripe = {
    prices: { retrieve: async (id) => { calls.push({ type: "price", id }); if (options.stripeError) throw Error("secret upstream detail"); return price; } },
    customers: { create: async (...args) => {
      calls.push({ type: "customer", args });
      const key = args[1].idempotencyKey, payload = JSON.stringify(args[0]);
      if (customerRequests.has(key)) {
        if (customerRequests.get(key) !== payload) throw Error("private idempotency mismatch");
      } else {
        customerRequests.set(key, payload); calls.push({ type: "customer-created" });
      }
      return { id: "cus_company" };
    } },
    checkout: { sessions: {
      create: async (...args) => { calls.push({ type: "session", args }); return session; },
      retrieve: async (id) => { calls.push({ type: "retrieve-session", id }); return session; },
    } },
    subscriptions: { retrieve: async (...args) => { calls.push({ type: "subscription", args }); return subscription; } },
    invoices: { retrieve: async (id) => { calls.push({ type: "invoice", id }); return invoice; } },
    webhooks: { constructEvent: () => { if (options.badSignature) throw Error("secret signature details"); return options.event ?? event(); } },
  };
  const dependencies = {
    "server-only": {},
    "react": { cache: (callback) => callback },
    "@/lib/env": { hasSupabaseEnv: () => true },
    "@/lib/supabase/admin-client": { hasSupabaseAdminEnv: () => true },
    "@/lib/supabase/server": { getSupabaseServerClient: async () => db },
    "@/lib/stripe/server": { getStripe: () => stripe, hasStripeWebhookEnv: () => !options.notConfigured, getAppUrl: () => "https://qa.invalid" },
    "@/lib/stripe/database": { getStripeDatabase: () => db, rpcObject },
    "next/navigation": { redirect: (location) => { throw { location }; } },
    "next/server": { NextResponse: { json: (data, options) => Response.json(data, options) } },
  };
  dependencies["@/lib/supabase/access"] = load("lib/supabase/access.ts", dependencies);
  dependencies["@/lib/stripe/plans"] = load("lib/stripe/plans.ts");
  dependencies["@/lib/stripe/offer"] = load("lib/stripe/offer.ts", dependencies);
  dependencies["@/lib/stripe/webhook"] = load("lib/stripe/webhook.ts", dependencies);
  return { calls, stripe, price, company, invoice, subscription,
    offer: dependencies["@/lib/stripe/offer"], webhook: dependencies["@/lib/stripe/webhook"],
    route: load("app/api/stripe/webhook/route.ts", dependencies),
    async checkout(plan = "beta") { try { await load("lib/stripe/checkout-action.ts", dependencies).createStripeCheckoutSession(plan); } catch (error) {
      if (error.location) return error.location; throw error;
    } },
  };
}
const event = (type = "customer.subscription.updated", object = { id: "sub_company" }) => ({ id: "evt_unit", created: 1800000000, livemode: false, type, data: { object } });
const sync = (h) => h.calls.find((c) => c.name === "apply_stripe_billing_event")?.args;

test("offre indisponible sans configuration, erreur privée masquée", async () => {
  for (const options of [{ notConfigured: true }, { stripeError: true }]) {
    const h = harness(options), result = await h.offer.getBetaCheckoutOffer();
    assert.equal(result.ready, false); assert.equal(result.displayPrice, null);
    assert.doesNotMatch(JSON.stringify(result), /secret|price_beta|sk_test/);
  }
});
test("offre bêta valide : prix réel affiché, variations incohérentes refusées", async () => {
  const h = harness(), result = await h.offer.getBetaCheckoutOffer();
  assert.equal(result.amount, 19.99); assert.match(result.displayPrice, /19,99/);
  for (const price of [{ unit_amount: 2990 }, { currency: "usd" }, { active: false }, { tax_behavior: "exclusive" },
    { type: "one_time", recurring: null }, { recurring: { interval: "year", interval_count: 1, usage_type: "licensed" } },
    { transform_quantity: { divide_by: 10, round: "up" } }]) {
    assert.equal((await harness({ price }).offer.getBetaCheckoutOffer()).ready, false);
  }
});
test("Checkout refuse visiteur, email non confirmé et rôles non gestionnaires avant tout appel Stripe", async () => {
  for (const options of [{ signedOut: true }, { unconfirmed: true }, { role: "member" }, { role: "readonly" }]) {
    const h = harness(options); assert.match(await h.checkout(), /login|forbidden/);
    assert.equal(h.calls.some((c) => ["price", "customer", "session", "rpc"].includes(c.type)), false);
  }
});
test("pending accepte seulement bêta, abonné actif ne crée pas de second abonnement", async () => {
  const h = harness(); assert.match(await h.checkout("pro"), /invalid_price/);
  const existing = harness({ company: { billing_status: "active", stripe_subscription_id: "sub_existing" } });
  assert.match(await existing.checkout(), /existing_subscription/);
  assert.equal(existing.calls.some((c) => c.type === "session"), false);
});
test("accès offert en cours : aucun paiement ni reprise de session Stripe", async () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const comped_until of [null, today, "2999-12-31"]) {
    for (const role of ["owner", "admin"]) {
      const h = harness({ role, existingSession: true, company: { billing_status: "comped", comped_until } });
      assert.equal(await h.checkout(), "/billing?stripe=offered_access");
      assert.equal(h.calls.some((call) => ["price", "customer", "session", "retrieve-session", "rpc"].includes(call.type)), false);
    }
  }
});
test("accès offert expiré : le responsable peut ouvrir le paiement", async () => {
  const h = harness({ company: { billing_status: "comped", comped_until: "2000-01-01" } });
  assert.match(await h.checkout(), /^https:\/\/checkout.stripe.com/);
  assert.equal(h.calls.filter((call) => call.type === "session").length, 1);
});
test("offre accordée après la lecture : la réservation SQL bloque aussi le paiement", async () => {
  const h = harness({ attempt: { ok: false, status: "complimentary_access" } });
  assert.equal(await h.checkout(), "/billing?stripe=offered_access");
  assert.equal(h.calls.some((call) => ["customer", "session", "retrieve-session"].includes(call.type)), false);
});
test("owner et admin : compagnie issue du profil, session récurrente, consentement, taxes stables, clés idempotentes", async () => {
  for (const role of ["owner", "admin"]) {
    const h = harness({ role, company: { stripe_customer_id: null } });
    assert.match(await h.checkout(), /^https:\/\/checkout.stripe.com/);
    const created = h.calls.find((c) => c.type === "session");
    assert.equal(created.args[0].mode, "subscription");
    assert.equal(created.args[0].metadata.companyId, companyId);
    assert.equal(created.args[0].line_items[0].price, "price_beta");
    assert.equal(created.args[0].automatic_tax.enabled, false);
    assert.equal(created.args[0].consent_collection.terms_of_service, "required");
    assert.equal(created.args[0].success_url, "https://qa.invalid/billing?stripe=success");
    assert.equal(created.args[1].idempotencyKey, `tadiff-checkout-${attemptId}`);
    assert.equal(h.calls.some((c) => c.name === "apply_stripe_billing_event"), false);
  }
});
test("réutilise la session et permet la reprise d’un premier paiement incomplet", async () => {
  const h = harness({ existingSession: true, company: { stripe_subscription_id: "sub_company" } });
  assert.match(await h.checkout(), /^https:/);
  assert.equal(h.calls.some((c) => c.type === "session"), false);
  assert.equal(h.calls.some((c) => c.type === "retrieve-session"), true);
});
test("reprise après association perdue et compagnie renommée : client Stripe unique et paramètres stables", async () => {
  const options = { rpcError: "bind_stripe_checkout_customer", company: { stripe_customer_id: null } };
  const h = harness(options);
  assert.match(await h.checkout(), /unavailable/);
  h.company.name = "Compagnie renommée";
  h.company.email = "nouveau@example.invalid";
  options.rpcError = undefined;
  assert.match(await h.checkout(), /^https:\/\/checkout.stripe.com/);
  const requests = h.calls.filter((c) => c.type === "customer");
  assert.equal(requests.length, 2);
  assert.equal(JSON.stringify(requests[0].args), JSON.stringify(requests[1].args));
  assert.equal(h.calls.filter((c) => c.type === "customer-created").length, 1);
  assert.equal(h.calls.filter((c) => c.type === "session").length, 1);
  assert.equal("name" in requests[0].args[0], false);
  assert.equal("email" in requests[0].args[0], false);
});
test("réservation, association customer ou persistance en échec : aucun faux succès", async () => {
  for (const rpcError of ["prepare_stripe_checkout", "bind_stripe_checkout_customer", "finish_stripe_checkout"]) {
    const h = harness({ rpcError, company: { stripe_customer_id: null } });
    assert.match(await h.checkout(), /unavailable/);
    if (rpcError !== "finish_stripe_checkout") assert.equal(h.calls.some((c) => c.type === "session"), false);
  }
});
test("session expirée libère la réservation seulement après confirmation Stripe, session terminée attend le webhook", async () => {
  const expired = harness({ existingSession: true, session: { status: "expired" } });
  assert.match(await expired.checkout(), /expired/);
  assert.equal(expired.calls.some((c) => c.name === "expire_stripe_checkout"), true);
  const complete = harness({ existingSession: true, session: { status: "complete" } });
  assert.match(await complete.checkout(), /success/); assert.equal(sync(complete), undefined);
});
test("réponse perdue trop ancienne : aucun nouveau Checkout", async () => {
  const h = harness({ attempt: { createdAt: "2020-01-01T00:00:00Z" } });
  assert.match(await h.checkout(), /unavailable/); assert.equal(h.calls.some((c) => c.type === "session"), false);
});
test("webhook : subscription active seule, essai et facture à zéro ne débloquent pas pending", async () => {
  for (const options of [{ invoice: { status: "open" } }, { invoice: { amount_paid: 0 } }, { subscription: { status: "trialing" } }]) {
    const h = harness(options); await h.webhook.processStripeEvent(event(), h.stripe);
    assert.notEqual(sync(h)?.p_status, "active");
  }
});
test("webhook : paiement confirmé rattaché transmet les données à la transaction SQL", async () => {
  const h = harness(); await h.webhook.processStripeEvent(event(), h.stripe);
  assert.equal(sync(h).p_payment_confirmed, true); assert.equal(sync(h).p_status, "active");
  assert.equal(sync(h).p_company_id, companyId); assert.equal(sync(h).p_event_id, "evt_unit");
  assert.equal(sync(h).p_checkout_attempt_id, attemptId);
});
test("webhook : pause récupérable ne libère pas la réservation comme une résiliation définitive", async () => {
  const h = harness({ subscription: { status: "paused" } }); await h.webhook.processStripeEvent(event(), h.stripe);
  assert.equal(sync(h).p_status, "past_due");
});
test("webhook : session sans paiement, facture non abonnement et associations étrangères ignorées", async () => {
  for (const status of ["unpaid", "no_payment_required"]) {
    const h = harness(); await h.webhook.processStripeEvent(event("checkout.session.completed", { payment_status: status }), h.stripe);
    assert.equal(sync(h), undefined);
  }
  const unrelatedInvoice = harness();
  await unrelatedInvoice.webhook.processStripeEvent(event("invoice.payment_succeeded", { customer: "cus_company" }), unrelatedInvoice.stripe);
  assert.equal(sync(unrelatedInvoice), undefined);
  for (const company of [{ stripe_customer_id: "cus_other" }, { stripe_subscription_id: "sub_other" }]) {
    const h = harness({ company }); await h.webhook.processStripeEvent(event(), h.stripe); assert.equal(sync(h), undefined);
  }
});
test("webhook : facture étrangère ne constitue pas une preuve de paiement", async () => {
  const h = harness({ invoice: { customer: "cus_other" } }); await h.webhook.processStripeEvent(event(), h.stripe);
  assert.equal(sync(h).p_payment_confirmed, false); assert.notEqual(sync(h).p_status, "active");
});
test("webhook : prix non configuré ne débloque pas un nouveau compte ; ancien prix connu conservé", async () => {
  const fresh = harness({ price: { id: "price_old" } }); await fresh.webhook.processStripeEvent(event(), fresh.stripe); assert.equal(sync(fresh), undefined);
  const existing = harness({ price: { id: "price_old", active: false }, company: { billing_status: "active", stripe_subscription_id: "sub_company", stripe_price_id: "price_old" } });
  await existing.webhook.processStripeEvent(event(), existing.stripe); assert.equal(sync(existing).p_status, "active");
});
test("webhook : ancien échec facture réconcilie l’état actuel ; session payée ancienne ne réactive pas une résiliation", async () => {
  const h = harness(); await h.webhook.processStripeEvent(event("invoice.payment_failed", { subscription: "sub_company" }), h.stripe);
  assert.equal(sync(h).p_status, "active");
  const canceled = harness({ subscription: { status: "canceled" } });
  await canceled.webhook.processStripeEvent(event("checkout.session.completed", { payment_status: "paid", mode: "subscription", subscription: "sub_company", customer: "cus_company", metadata: { companyId } }), canceled.stripe);
  assert.equal(sync(canceled).p_status, "cancelled");
});
test("webhook : crédits William gardent leur RPC idempotente et une erreur est propagée", async () => {
  const purchase = event("checkout.session.completed", { id: "cs_credits", payment_status: "paid", amount_total: 500, currency: "eur",
    metadata: { purchaseType: "ai_credits", companyId, tokenAmount: "1000", purchasedBy: userId } });
  const h = harness(); await h.webhook.processStripeEvent(purchase, h.stripe);
  assert.equal(h.calls.find((c) => c.name === "grant_ai_credit_purchase").args.p_stripe_checkout_session_id, "cs_credits");
  assert.equal(sync(h), undefined);
  const fail = harness({ rpcError: "grant_ai_credit_purchase" });
  await assert.rejects(fail.webhook.processStripeEvent(purchase, fail.stripe), /Credit synchronization/);
});
test("route : signature invalide400, échec SQL500, succès200 ; aucune information privée", async () => {
  for (const [options, expected] of [[{ badSignature: true }, 400], [{ rpcError: "apply_stripe_billing_event" }, 500], [{}, 200]]) {
    const h = harness(options);
    const response = await h.route.POST(new Request("https://qa.invalid/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "unit" }, body: "{}" }));
    assert.equal(response.status, expected); assert.doesNotMatch(await response.text(), /secret|private|sk_test|qa@example/);
  }
});
test("route : signature Stripe réelle sur le corps brut, altération et signature absente refusées", async () => {
  const h = harness();
  const verifier = new Stripe("sk_test_unit_only");
  h.stripe.webhooks.constructEvent = verifier.webhooks.constructEvent.bind(verifier.webhooks);
  const payload = JSON.stringify(event());
  const signature = verifier.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  const request = (body, header = signature) => new Request("https://qa.invalid/api/stripe/webhook", {
    method: "POST", headers: header ? { "stripe-signature": header } : {}, body,
  });
  assert.equal((await h.route.POST(request(payload))).status, 200);
  assert.equal((await h.route.POST(request(payload + " "))).status, 400);
  assert.equal((await h.route.POST(request(payload, null))).status, 400);
  assert.equal(h.calls.filter((c) => c.name === "apply_stripe_billing_event").length, 1);
});
