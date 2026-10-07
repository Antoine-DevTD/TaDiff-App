import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StripeCheckoutForm } from "@/components/billing/stripe-checkout-form";
import { PlannedFeatureBadge } from "@/components/ui/planned-feature";
import { formatCurrency, getFixedCostSharePerPerformance } from "@/lib/finance";
import { getBillingPlans, getFixedCosts, getQuoteItems } from "@/lib/supabase/queries";
import { getBetaCheckoutOffer } from "@/lib/stripe/offer";
import { getWorkspaceAccess } from "@/lib/supabase/access";
import type { QuoteItem } from "@/types";

function getQuoteTone(status: QuoteItem["status"]) {
  if (status === "Archive") return "success" as const;
  if (status === "Acompte attendu" || status === "Solde attendu") return "warning" as const;
  return "neutral" as const;
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const [plans, quotes, fixedCosts, offer, access, params] = await Promise.all([
    getBillingPlans(),
    getQuoteItems(),
    getFixedCosts(),
    getBetaCheckoutOffer(),
    getWorkspaceAccess(),
    searchParams,
  ]);
  const quotesTotal = quotes.reduce((total, quote) => total + quote.amount, 0);
  const depositsDue = quotes.reduce((total, quote) => total + quote.depositDue, 0);
  const balancesDue = quotes.reduce((total, quote) => total + quote.balanceDue, 0);
  const fixedCostShare = getFixedCostSharePerPerformance({
    costs: fixedCosts,
    targetPerformancesPerYear: 24,
  });
  const offeredAccess = access.billingStatus === "comped" && access.hasAccess;
  const paymentMessages: Record<string, string> = {
    offered_access: "Votre compagnie bénéficie déjà d’un accès offert.",
    success: "Votre paiement a été transmis. Le statut de votre accès sera actualisé après confirmation.",
    cancelled: "Le paiement a été interrompu. Aucun nouvel accès n’a été activé.",
    expired: "La page de paiement a expiré. Vous pouvez recommencer.",
    missing_configuration: "Le paiement n’est pas encore disponible. Contactez l’équipe TaDiff.",
    invalid_price: "L’offre doit être vérifiée par l’équipe TaDiff avant le paiement.",
    forbidden: "Seul un responsable avec une adresse email confirmée peut gérer cet abonnement.",
    existing_subscription: "Un abonnement est déjà associé à cette compagnie. Contactez l’équipe TaDiff pour le modifier ou résoudre un problème de paiement.",
    unavailable: "Le paiement n’a pas pu être ouvert. Réessayez dans quelques instants.",
  };
  const paymentMessage = params.stripe ? paymentMessages[params.stripe] : null;

  return (
    <div className="space-y-6">
      {paymentMessage && <p role="status" className="rounded-lg border border-border bg-panel p-4 text-sm leading-6">{paymentMessage}</p>}
      <div className="flex justify-end">
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
            <p className="text-base font-semibold">Devis et échéances</p>
            <p className="mt-1 text-sm text-muted">
              Les devis sont rattachés aux dates possibles et alimentent acomptes, soldes et priorités cash.
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
                  Échéance {new Date(quote.dueDate).toLocaleDateString("fr-FR")}
                </p>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Abonnement TaDiff</p>
                <p className="mt-1 text-sm text-muted">
                  {offeredAccess ? "Votre compagnie bénéficie d’un accès offert." : "Le paiement sécurisé est assuré par Stripe. L’accès est activé après confirmation du règlement."}
                </p>
              </div>
              <Badge className="shrink-0" tone={offeredAccess || access.billingStatus === "active" ? "success" : "neutral"}>
                {offeredAccess ? "Accès offert" : access.billingStatus === "active" ? "Abonnement actif" : "Offre bêta"}
              </Badge>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Bêta pilote</p>
                  <p className="mt-1 text-sm text-muted">
                    Abonnement mensuel avec renouvellement automatique, résiliable pour la fin de la période payée.
                  </p>
                </div>
                {offer.ready && <p className="shrink-0 text-sm font-semibold">{offer.displayPrice} TTC / mois</p>}
              </div>
              <StripeCheckoutForm
                className="mt-4 w-full sm:w-auto"
                disabled={!offer.ready || !access.canManage || access.billingStatus === "active" || offeredAccess}
                planCode="beta"
              >
                Passer au paiement sécurisé
              </StripeCheckoutForm>
              {!offer.ready && !offeredAccess ? (
                <p className="mt-3 text-xs text-muted">
                  {offer.message}
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
