import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Tarifs simples pour la V1.</h1>
        <p className="mt-4 text-muted">
          Le paiement sera ajoute dans un lot dedie. Cette page reserve la place du futur
          plan SaaS sans integrer Stripe ou Lemon Squeezy pour le moment.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-muted">Studio</p>
          <p className="mt-3 text-3xl font-semibold">A definir</p>
          <p className="mt-3 text-sm text-muted">
            Pour structurer la diffusion, les spectacles et les contacts de votre compagnie.
          </p>
          <ButtonLink href="/signup" className="mt-6">
            Rejoindre la beta
          </ButtonLink>
        </Card>
        <Card className="bg-ink text-white">
          <p className="text-sm font-medium text-white/60">Equipe</p>
          <p className="mt-3 text-3xl font-semibold">Sur mesure</p>
          <p className="mt-3 text-sm text-white/70">
            Pour les bureaux de production, collectifs et structures multi-projets.
          </p>
          <ButtonLink href="/signup" variant="secondary" className="mt-6">
            Demander un acces
          </ButtonLink>
        </Card>
      </div>
    </main>
  );
}
