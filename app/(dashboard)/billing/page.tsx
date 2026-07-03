import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { getBillingPlans, getQuoteItems } from "@/lib/supabase/queries";
import type { QuoteItem } from "@/types";

function getQuoteTone(status: QuoteItem["status"]) {
  if (status === "Archive") return "success" as const;
  if (status === "Acompte attendu" || status === "Solde attendu") return "warning" as const;
  return "neutral" as const;
}

export default async function BillingPage() {
  const [plans, quotes] = await Promise.all([getBillingPlans(), getQuoteItems()]);
  const quotesTotal = quotes.reduce((total, quote) => total + quote.amount, 0);
  const depositsDue = quotes.reduce((total, quote) => total + quote.depositDue, 0);
  const balancesDue = quotes.reduce((total, quote) => total + quote.balanceDue, 0);
  const currentPlan = plans.find((plan) => plan.current) ?? plans[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Facturation</h2>
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
        <MetricCard label="Plan cible" value={currentPlan.name} detail={`${currentPlan.monthlyPrice} EUR / mois`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold">Devis et echeances</p>
            <p className="mt-1 text-sm text-muted">
              Les devis sont rattaches au pipeline et alimentent acomptes, soldes et priorites cash.
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
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <InfoCell label="Montant" value={formatCurrency(quote.amount)} />
                  <InfoCell label="Acompte" value={formatCurrency(quote.depositDue)} />
                  <InfoCell label="Solde" value={formatCurrency(quote.balanceDue)} />
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
                  Les plans sont modelises. L activation attend les cles Stripe et le webhook.
                </p>
              </div>
              <Badge tone="warning">A brancher</Badge>
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
              <Badge>Preview</Badge>
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
