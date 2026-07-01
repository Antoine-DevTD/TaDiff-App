import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { billingPlans } from "@/data/mock-data";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <Badge>Tarifs</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Simple, transparent, sans mauvaise surprise.
        </h1>
        <p className="mt-4 text-muted">
          Les plans reprennent la grille cible de TaDiff. Le paiement Stripe est prepare
          dans le module facturation, sans activation tant que les cles ne sont pas configurees.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {billingPlans.map((plan) => (
          <Card key={plan.id} className={plan.current ? "border-accent bg-ink text-white" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={plan.current ? "text-sm text-white/60" : "text-sm text-muted"}>{plan.name}</p>
                <p className="mt-3 text-4xl font-semibold">{plan.monthlyPrice} EUR</p>
                <p className={plan.current ? "mt-1 text-sm text-white/60" : "mt-1 text-sm text-muted"}>
                  {plan.annualPrice} EUR / mois en annuel
                </p>
              </div>
              {plan.current ? <Badge tone="warning">Recommande</Badge> : null}
            </div>
            <p className={plan.current ? "mt-5 text-sm text-white/72" : "mt-5 text-sm text-muted"}>
              {plan.description}
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className={plan.current ? "text-white" : "text-accent"}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/signup"
              variant={plan.current ? "secondary" : "primary"}
              className="mt-6 w-full"
            >
              {plan.id === "studio" ? "Contacter l'equipe" : "Commencer"}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-5">
        <p className="font-semibold">Paiement et donnees</p>
        <p className="mt-2 text-sm text-muted">
          Paiement Stripe, abonnement resiliable, donnees hebergees en Europe et export
          FEC prevu pour la passerelle comptable.
        </p>
      </Card>
    </main>
  );
}
