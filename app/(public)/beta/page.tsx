import { BetaSignupForm } from "@/components/beta/beta-signup-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { betaReservedSeatLimit } from "@/lib/beta";
import { getBetaSignupStats } from "@/lib/supabase/queries";

const betaBenefits = [
  "Cockpit trésorerie et prochaines actions",
  "Spectacles, affiches et dossiers de depot",
  "Radar subventions et pièces manquantes",
  "Carnet de contacts avec actions recommandees",
];

const betaSteps = [
  "On configure votre compagnie avec vous",
  "Vous testez sur vos vrais spectacles",
  "On fait un point au milieu de la bêta",
  "On priorise les ameliorations avant lancement",
];

export default async function BetaPage() {
  const stats = await getBetaSignupStats();
  const isLastSeat = stats.remainingReservedSeats === 1;
  const isFull = stats.remainingReservedSeats === 0;

  return (
    <main>
      <section className="border-b border-border bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_0.78fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <Badge className="w-fit bg-white/10 text-white">Bêta compagnies</Badge>
            {isLastSeat ? (
              <Badge className="mt-3 w-fit bg-warning text-ink">Derniere place disponible</Badge>
            ) : null}
            {isFull ? (
              <Badge className="mt-3 w-fit bg-white/10 text-white">Liste d&apos;attente ouverte</Badge>
            ) : null}
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {betaReservedSeatLimit} compagnies pour tester le cockpit avant le lancement.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              La bêta TaDiff demarre le 6 aout 2026 a 19,99 EUR. Les {betaReservedSeatLimit} premières
              compagnies gardent un accompagnement prioritaire pendant la période de test.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Places bêta" value={betaReservedSeatLimit.toString()} />
              <HeroMetric
                label="Déjà réservées"
                value={stats.reservedCount.toString()}
              />
              <HeroMetric
                label={isLastSeat ? "Derniere place" : isFull ? "Disponibilite" : "Restantes"}
                value={isLastSeat ? "Disponible" : isFull ? "Attente" : stats.remainingReservedSeats.toString()}
              />
            </div>
          </div>

          <Card className="bg-white p-5 text-ink">
            <div className="mb-5">
              <p className="text-lg font-semibold">
                {isLastSeat
                  ? "Réserver la dernière place bêta"
                  : isFull
                    ? "Rejoindre la liste d'attente"
                    : "Réserver une place bêta"}
              </p>
              <p className="mt-2 text-sm text-muted">
                Les {betaReservedSeatLimit} premières places sont reservees. Au-dela, les compagnies passent sur
                liste d&apos;attente prioritaire.
              </p>
            </div>
            <BetaSignupForm />
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card className="p-5">
          <Badge tone="success">Ce que vous testez</Badge>
          <div className="mt-5 grid gap-3">
            {betaBenefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-md border border-border bg-panel-strong/45 p-4"
              >
                <p className="font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <Badge tone="warning">Accompagnement</Badge>
          <div className="mt-5 grid gap-3">
            {betaSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-md border border-border bg-panel-strong/45 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="font-medium">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
