import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/supabase/queries";
import { getPipelinePriorityScore } from "@/lib/pipeline";
import type { PipelineDeal, Reminder, Show } from "@/types";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getReminderTone(reminder: Reminder) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(reminder.dueDate));

  if (due < today) return "danger";
  if (due.getTime() === today.getTime()) return "warning";
  if (reminder.priority === "high") return "warning";
  return "neutral";
}

function getReminderLabel(reminder: Reminder) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(reminder.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} j`;
  if (diffDays === 0) return "A faire aujourd hui";
  if (diffDays === 1) return "Demain";
  if (diffDays <= 7) return `Dans ${diffDays} j`;
  return new Date(reminder.dueDate).toLocaleDateString("fr-FR");
}

function getShowTone(show: Show) {
  if (show.status === "En diffusion") return "success";
  if (show.status === "En pause") return "warning";
  return "neutral";
}

function getWeightedValue(deal: PipelineDeal) {
  return Math.round((deal.value * deal.probability) / 100);
}

export default async function DashboardPage() {
  const { contacts, dashboardStats, pipelineDeals, reminders, shows } =
    await getDashboardData();

  const priorityReminders = [...reminders]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const activeDeals = pipelineDeals
    .filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu")
    .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a));

  const priorityDeals = activeDeals.slice(0, 4);
  const activeShows = shows
    .filter((show) => show.status !== "En pause")
    .sort((a, b) => new Date(a.nextDate || "2999-12-31").getTime() - new Date(b.nextDate || "2999-12-31").getTime())
    .slice(0, 4);

  const focusReminder = priorityReminders[0] ?? null;
  const focusDeal = priorityDeals[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus du jour</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {focusReminder?.label || focusDeal?.title || "Aucun sujet prioritaire"}
              </h2>
            </div>
            {focusReminder ? (
              <Badge tone={getReminderTone(focusReminder)}>{getReminderLabel(focusReminder)}</Badge>
            ) : null}
          </div>

          <p className="text-sm text-muted">
            {focusReminder?.relatedTo ||
              focusDeal?.nextAction ||
              "Le dashboard mettra ici la prochaine action a sortir des que le pipeline tourne."}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Relance prioritaire</p>
              <p className="mt-2 font-medium">{focusReminder?.label || "Aucune relance ouverte"}</p>
              <p className="mt-1 text-sm text-muted">
                {focusReminder
                  ? `${focusReminder.relatedTo || "Sans contexte"} · ${new Date(focusReminder.dueDate).toLocaleDateString("fr-FR")}`
                  : "La liste d execution reminders sera votre point de sortie."}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Deal prioritaire</p>
              <p className="mt-2 font-medium">{focusDeal?.title || "Aucune opportunite active"}</p>
              <p className="mt-1 text-sm text-muted">
                {focusDeal
                  ? `${focusDeal.contactName} · ${getWeightedValue(focusDeal).toLocaleString("fr-FR")} EUR ponderes`
                  : "Le pipeline vous remontera ici les opportunites les plus chaudes."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Actions rapides</p>
            <p className="mt-2 text-sm text-muted">
              Acces direct aux ecrans qui servent vraiment au quotidien.
            </p>
          </div>
          <div className="grid gap-3">
            <ActionLink
              href="/pipeline"
              title="Traiter le pipeline"
              detail="Voir les cartes a relancer et ajouter une opportunite."
            />
            <ActionLink
              href="/reminders"
              title="Sortir les relances"
              detail="Executer les suivis du jour et vider le retard."
            />
            <ActionLink
              href="/shows/new"
              title="Ajouter un spectacle"
              detail="Creer une fiche diffusion propre avec prochaine date et budget."
            />
            <ActionLink
              href="/contacts/new"
              title="Ajouter un contact"
              detail="Enregistrer une salle, un programmateur ou un partenaire."
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Relances a traiter</p>
              <p className="mt-1 text-sm text-muted">Les prochaines sorties commerciales.</p>
            </div>
            <ButtonLink href="/reminders" variant="secondary">
              Voir tout
            </ButtonLink>
          </div>

          {priorityReminders.length === 0 ? (
            <EmptyBlock text="Aucune relance ouverte." />
          ) : (
            <div className="space-y-3">
              {priorityReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{reminder.label}</p>
                      <Badge tone={getReminderTone(reminder)}>{getReminderLabel(reminder)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {reminder.relatedTo || "Sans contexte"} ·{" "}
                      {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Link className="text-sm font-medium text-accent hover:text-accent-strong" href="/reminders">
                    Ouvrir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Pipeline prioritaire</p>
              <p className="mt-1 text-sm text-muted">Les opportunites a faire avancer maintenant.</p>
            </div>
            <ButtonLink href="/pipeline" variant="secondary">
              Ouvrir le pipeline
            </ButtonLink>
          </div>

          {priorityDeals.length === 0 ? (
            <EmptyBlock text="Aucune opportunite active." />
          ) : (
            <div className="space-y-3">
              {priorityDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-lg border border-border bg-panel-strong/35 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{deal.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {deal.contactName} · {deal.showTitle}
                      </p>
                    </div>
                    <Badge>{deal.stage}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted">Pondere</p>
                      <p className="mt-1 font-medium">
                        {getWeightedValue(deal).toLocaleString("fr-FR")} EUR
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Relance</p>
                      <p className="mt-1 font-medium">
                        {deal.nextFollowUpAt
                          ? new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")
                          : "A planifier"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {deal.nextAction || "Prochaine action a definir"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Spectacles a suivre</p>
              <p className="mt-1 text-sm text-muted">Dates et budgets a garder en ligne de mire.</p>
            </div>
            <ButtonLink href="/shows" variant="secondary">
              Voir les spectacles
            </ButtonLink>
          </div>
          {activeShows.length === 0 ? (
            <EmptyBlock text="Aucun spectacle actif pour le moment." />
          ) : (
            <div className="space-y-3">
              {activeShows.map((show) => (
                <Link
                  key={show.id}
                  className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                  href={`/shows/${show.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{show.title}</p>
                      <p className="mt-1 text-sm text-muted">{show.discipline}</p>
                    </div>
                    <Badge tone={getShowTone(show)}>{show.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted">Prochaine date</p>
                      <p className="mt-1 font-medium">
                        {show.nextDate
                          ? new Date(show.nextDate).toLocaleDateString("fr-FR")
                          : "Non renseignee"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Budget</p>
                      <p className="mt-1 font-medium">{show.budget.toLocaleString("fr-FR")} EUR</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Contacts a activer</p>
              <p className="mt-1 text-sm text-muted">Les derniers interlocuteurs disponibles dans le CRM.</p>
            </div>
            <ButtonLink href="/contacts" variant="secondary">
              Voir les contacts
            </ButtonLink>
          </div>
          {contacts.length === 0 ? (
            <EmptyBlock text="Aucun contact cree." />
          ) : (
            <div className="space-y-3">
              {contacts.slice(0, 5).map((contact) => (
                <Link
                  key={contact.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
                  href={`/contacts/${contact.id}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {[contact.organization, contact.city].filter(Boolean).join(" · ") || "Contact sans detail"}
                    </p>
                  </div>
                  <Badge>{contact.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      {contacts.length === 0 && shows.length === 0 && pipelineDeals.length === 0 && reminders.length === 0 ? (
        <EmptyState
          title="Commencez par remplir votre espace"
          description="Ajoutez un spectacle, un contact, puis une opportunite pour que le dashboard devienne utile."
        />
      ) : null}
    </div>
  );
}

function ActionLink({
  detail,
  href,
  title,
}: {
  detail: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={href}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </Link>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-panel-strong/45 p-4 text-sm text-muted">
      {text}
    </div>
  );
}
