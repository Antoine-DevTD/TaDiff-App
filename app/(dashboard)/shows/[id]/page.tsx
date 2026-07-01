import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDealProfitability, formatCurrency, getShowCostProfile, getVerdictMeta } from "@/lib/finance";
import { getShowById } from "@/lib/supabase/queries";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { id } = await params;
  const { opportunities, reminders, show } = await getShowById(id);

  if (!show) {
    notFound();
  }

  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const costProfile = getShowCostProfile(show);
  const profitabilityRows = opportunities.map((deal) => ({
    deal,
    result: buildDealProfitability({ deal, show }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Fiche spectacle</p>
          <h2 className="mt-2 text-3xl font-semibold">{show.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {show.notes || "Aucune note de production pour le moment."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={show.status === "En diffusion" ? "success" : "neutral"}>{show.status}</Badge>
          <ButtonLink href="/shows/new" variant="secondary">
            Nouveau spectacle
          </ButtonLink>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Discipline" value={show.discipline} />
        <StatBlock
          label="Prochaine date"
          value={show.nextDate ? new Date(show.nextDate).toLocaleDateString("fr-FR") : "A planifier"}
        />
        <StatBlock label="Budget" value={`${show.budget.toLocaleString("fr-FR")} EUR`} />
        <StatBlock label="CA pondere" value={`${weightedRevenue.toLocaleString("fr-FR")} EUR`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Structure de couts</CardTitle>
            <CardDescription>Base utilisee par le calculateur de rentabilite.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCell label="Artistes" value={formatCurrency(costProfile.artistFees)} />
            <InfoCell label="Technique" value={formatCurrency(costProfile.technicalFees)} />
            <InfoCell label="Droits" value={formatCurrency(costProfile.rights)} />
            <InfoCell label="Production" value={formatCurrency(costProfile.production)} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rentabilite opportunites</CardTitle>
            <CardDescription>Les dates a perte remontent avant signature.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {profitabilityRows.length === 0 ? (
              <EmptyPanel text="Aucune opportunite a calculer." />
            ) : (
              profitabilityRows.map(({ deal, result }) => {
                const verdict = getVerdictMeta(result.verdict);

                return (
                  <div key={deal.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          Marge {formatCurrency(result.margin)} - point mort {formatCurrency(result.breakEven)}
                        </p>
                      </div>
                      <Badge tone={verdict.tone}>{verdict.label}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Opportunites liees</CardTitle>
            <CardDescription>Diffusion, negociation et prochaines actions sur ce spectacle.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <EmptyPanel text="Aucune opportunite liee a ce spectacle." />
            ) : (
              opportunities.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {deal.contactName} · {deal.contactOrganization || deal.venue}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {deal.nextAction || "Prochaine action a definir"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-medium">{deal.value.toLocaleString("fr-FR")} EUR</p>
                      <p className="text-xs text-muted">{deal.probability}%</p>
                    </div>
                    <Badge>{deal.stage}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relances associees</CardTitle>
              <CardDescription>Suivi des actions prevues pour ce spectacle.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <EmptyPanel text="Aucune relance ouverte sur ce spectacle." />
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <p className="font-medium">{reminder.label}</p>
                    <p className="mt-1 text-sm text-muted">{reminder.relatedTo || show.title}</p>
                    <p className="mt-2 text-xs text-muted">
                      {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation rapide</CardTitle>
              <CardDescription>Aller directement aux modules relies.</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/pipeline" variant="secondary">
                Ouvrir le pipeline
              </ButtonLink>
              <ButtonLink href="/reminders" variant="secondary">
                Voir les relances
              </ButtonLink>
              <Link className="inline-flex min-h-10 items-center text-sm font-medium text-accent hover:text-accent-strong" href="/shows">
                Retour a la liste
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
      {text}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-strong/45 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
