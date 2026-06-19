import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dashboardStats, pipelineDeals, reminders } from "@/data/mock-data";

const features = [
  "CRM de diffusion",
  "Relances structurees",
  "Suivi des spectacles",
  "Pilotage financier simple",
  "Documents centralises",
  "PWA pour equipe mobile",
];

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit" tone="warning">
            SaaS spectacle vivant
          </Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Le studio de pilotage pour compagnies, tournees et diffusion.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            TaDiff rassemble spectacles, contacts, prospects, relances, contrats,
            finances et documents dans un espace clair pense pour le theatre et le
            spectacle vivant.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup">Creer un espace demo</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Voir le dashboard
            </ButtonLink>
          </div>
        </div>
        <Card className="grid gap-4 bg-ink p-4 text-white shadow-xl">
          <div className="rounded-md bg-white/8 p-4">
            <p className="text-sm text-white/60">Pipeline qualifie</p>
            <div className="mt-4 space-y-3">
              {pipelineDeals.map((deal) => (
                <div key={deal.id} className="rounded-md bg-white p-3 text-ink">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{deal.title}</p>
                      <p className="text-sm text-muted">{deal.venue}</p>
                    </div>
                    <span className="text-sm font-semibold">{deal.value.toLocaleString("fr-FR")} EUR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboardStats.slice(0, 2).map((stat) => (
              <div key={stat.label} className="rounded-md bg-white/8 p-4">
                <p className="text-sm text-white/60">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="border-y border-border bg-panel">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <div key={feature} className="rounded-lg border border-border bg-background p-5">
              <p className="font-semibold">{feature}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Un socle pret pour connecter les donnees metier au fil des prochains lots.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold">Une application pensee pour le rythme des equipes.</h2>
            <p className="mt-3 text-muted">
              Les prochaines briques brancheront Supabase, les CRUD, le kanban et le
              calendrier sans casser la structure poseee ici.
            </p>
          </div>
          <div className="grid gap-3">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{reminder.label}</p>
                  <p className="text-sm text-muted">{reminder.relatedTo}</p>
                </div>
                <Badge>{new Date(reminder.dueDate).toLocaleDateString("fr-FR")}</Badge>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
