import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StripeCheckoutForm } from "@/components/billing/stripe-checkout-form";
import { PageTitle } from "@/components/ui/page-title";
import { PlannedFeatureBadge } from "@/components/ui/planned-feature";
import { formatCurrency, getFixedCostSharePerPerformance } from "@/lib/finance";
import { getBillingPlans, getFixedCosts, getQuoteItems } from "@/lib/supabase/queries";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { hasStripePrice } from "@/lib/stripe/plans";
import { hasStripeEnv, hasStripeWebhookEnv } from "@/lib/stripe/server";
import type { QuoteItem } from "@/types";

function getQuoteTone(status: QuoteItem["status"]) {
  if (status === "Archive") return "success" as const;
  if (status === "Acompte attendu" || status === "Solde attendu") return "warning" as const;
  return "neutral" as const;
}

export default async function BillingPage() {
  const [plans, quotes, fixedCosts] = await Promise.all([
    getBillingPlans(),
    getQuoteItems(),
    getFixedCosts(),
  ]);
  const quotesTotal = quotes.reduce((total, quote) => total + quote.amount, 0);
  const depositsDue = quotes.reduce((total, quote) => total + quote.depositDue, 0);
  const balancesDue = quotes.reduce((total, quote) => total + quote.balanceDue, 0);
  const fixedCostShare = getFixedCostSharePerPerformance({
    costs: fixedCosts,
    targetPerformancesPerYear: 24,
  });
  const stripeReady = hasStripeEnv() && hasStripeWebhookEnv() && hasSupabaseAdminEnv();
  const betaPriceReady = hasStripePrice("beta");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <PageTitle href="/billing">Facturation</PageTitle>
          <p className="mt-1 text-sm text-muted">
            Devis, acomptes, soldes, abonnement cible et export FEC pret a brancher.
          </p>
        </div>
        <ButtonLink href="/pricing" variant="secondary">
          Voir les plans publics
        </ButtonLink>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Devis actifs" value={formatCurrency(quotesTotal)} detail={`${quotes.length} dossiers`} />
        <MetricCard label="Acomptes" value={formatCurrency(depositsDue)} detail="A encaisser" />
        <MetricCard label="Soldes" value={formatCurrency(balancesDue)} detail="Reste a facturer" />
        <MetricCard label="Frais fixes/date" value={formatCurrency(fixedCostShare)} detail="A lisser dans les devis" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Devis et echeances</p>
            <p className="mt-1 text-sm text-muted">
              Les devis sont rattaches aux dates possibles et alimentent acomptes, soldes et priorites cash.
            </p>
          </div>
          <div className="space-y-3">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                href={`/billing/${quote.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{quote.number} - {quote.title}</p>
                    <p className="mt-1 text-sm text-muted">{quote.organization}</p>
                  </div>
                  <Badge tone={getQuoteTone(quote.status)}>{quote.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                  <InfoCell label="Montant" value={formatCurrency(quote.amount)} />
                  <InfoCell label="Acompte" value={formatCurrency(quote.depositDue)} />
                  <InfoCell label="Solde" value={formatCurrency(quote.balanceDue)} />
                  <InfoCell label="Frais fixes" value={formatCurrency(fixedCostShare)} />
                </div>
                <p className="mt-3 text-xs text-muted">
                  Echeance {new Date(quote.dueDate).toLocaleDateString("fr-FR")}
                </p>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Stripe</p>
                <p className="mt-1 text-sm text-muted">
                  Checkout est branche en mode test. Le webhook met a jour le statut compagnie
                  quand Stripe confirme ou refuse le paiement.
                </p>
              </div>
              <Badge className="shrink-0" tone={stripeReady && betaPriceReady ? "success" : "warning"}>
                {stripeReady && betaPriceReady ? "Mode test pret" : "Configuration incomplete"}
              </Badge>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Beta pilote</p>
                  <p className="mt-1 text-sm text-muted">
                    Abonnement test a 19,99 EUR / mois pour les 10 compagnies de la beta.
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">19,99 EUR</p>
              </div>
              <StripeCheckoutForm
                className="mt-4 w-full sm:w-auto"
                disabled={!stripeReady || !betaPriceReady}
                planCode="beta"
              >
                Demarrer le paiement test
              </StripeCheckoutForm>
              {!stripeReady || !betaPriceReady ? (
                <p className="mt-3 text-xs text-muted">
                  Variables requises : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
                  STRIPE_PRICE_BETA_MONTHLY, SUPABASE_SERVICE_ROLE_KEY.
                </p>
              ) : null}
            </div>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-border bg-panel-strong/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="mt-1 text-sm text-muted">{plan.description}</p>
                    </div>
                    <p className="text-sm font-semibold">{plan.monthlyPrice} EUR</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Export FEC</p>
                <p className="mt-1 text-sm text-muted">
                  Les lignes comptables sont preparees depuis devis, acomptes et soldes.
                </p>
              </div>
              <PlannedFeatureBadge className="shrink-0" />
            </div>
            <div className="rounded-lg border border-border bg-panel-strong/35 p-4 text-sm">
              <div className="grid grid-cols-[90px_1fr_110px] gap-3 text-xs uppercase tracking-[0.12em] text-muted">
                <span>Journal</span>
                <span>Libelle</span>
                <span className="text-right">Credit</span>
              </div>
              {quotes.slice(0, 3).map((quote) => (
                <div key={quote.id} className="mt-3 grid grid-cols-[90px_1fr_110px] gap-3">
                  <span>VT</span>
                  <span>{quote.number}</span>
                  <span className="text-right">{formatCurrency(quote.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
