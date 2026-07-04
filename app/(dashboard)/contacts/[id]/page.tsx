import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContactById } from "@/lib/supabase/queries";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  const { contact, opportunities, reminders, shows } = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Fiche contact</p>
          <h2 className="mt-2 text-3xl font-semibold">{contact.name}</h2>
          <p className="mt-2 text-sm text-muted">
            {[contact.role, contact.organization, contact.city].filter(Boolean).join(" - ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={contact.status === "Partenaire" ? "success" : "neutral"}>
            {contact.status}
          </Badge>
          <ButtonLink href="/contacts/new" variant="secondary">
            Nouveau contact
          </ButtonLink>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Structure" value={contact.organization} />
        <StatBlock label="Role" value={contact.role || "A renseigner"} />
        <StatBlock label="Email" value={contact.email || "A renseigner"} />
        <StatBlock label="CA pondere" value={`${weightedRevenue.toLocaleString("fr-FR")} EUR`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Opportunites liees</CardTitle>
            <CardDescription>Pipeline commercial associe a ce contact.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <EmptyPanel text="Aucune opportunite ouverte pour ce contact." />
            ) : (
              opportunities.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="mt-1 text-sm text-muted">{deal.showTitle}</p>
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
              <CardDescription>Actions ouvertes pour cette relation.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <EmptyPanel text="Aucune relance ouverte pour ce contact." />
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <p className="font-medium">{reminder.label}</p>
                    <p className="mt-1 text-sm text-muted">{reminder.relatedTo || contact.organization}</p>
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
              <CardTitle>Spectacles concernes</CardTitle>
              <CardDescription>Creations deja discutees avec ce contact.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {shows.length === 0 ? (
                <EmptyPanel text="Aucun spectacle relie a ce contact." />
              ) : (
                shows.map((show) => (
                  <div key={show.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <p className="font-medium">{show.title}</p>
                    <p className="mt-1 text-sm text-muted">{show.discipline}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation rapide</CardTitle>
              <CardDescription>Aller aux modules relies.</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/pipeline" variant="secondary">
                Ouvrir le pipeline
              </ButtonLink>
              <ButtonLink href="/reminders" variant="secondary">
                Voir les relances
              </ButtonLink>
              <Link
                className="inline-flex min-h-10 items-center text-sm font-medium text-accent hover:text-accent-strong"
                href="/contacts"
              >
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
