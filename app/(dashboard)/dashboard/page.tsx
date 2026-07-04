import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getDashboardData,
  getFixedCosts,
  getGrantOpportunities,
  getQuoteItems,
  getShowDocuments,
} from "@/lib/supabase/queries";
import { formatCurrency, getMonthlyFixedCostsTotal } from "@/lib/finance";
import { getPipelinePriorityScore } from "@/lib/pipeline";
import { getShowDocumentReadiness } from "@/lib/show-documents";
import type { FixedCost, GrantOpportunity, PipelineDeal, QuoteItem, Reminder, Show, ShowDocument } from "@/types";

type Tone = "danger" | "neutral" | "success" | "warning";

type TheatreAction = {
  detail: string;
  href: string;
  label: string;
  title: string;
  tone: Tone;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getDaysUntil(date: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(date));

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getReminderTone(reminder: Reminder): Tone {
  const days = getDaysUntil(reminder.dueDate);

  if (days < 0) return "danger";
  if (days <= 1 || reminder.priority === "high") return "warning";
  return "neutral";
}

function getReminderLabel(reminder: Reminder) {
  const days = getDaysUntil(reminder.dueDate);

  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Aujourd hui";
  if (days === 1) return "Demain";
  if (days <= 7) return `Dans ${days} j`;
  return new Date(reminder.dueDate).toLocaleDateString("fr-FR");
}

function getWeightedValue(deal: PipelineDeal) {
  return Math.round((deal.value * deal.probability) / 100);
}

function getShowTone(show: Show): Tone {
  if (show.status === "En diffusion") return "success";
  if (show.status === "En pause") return "warning";
  return "neutral";
}

function getToneLabel(tone: Tone) {
  if (tone === "success") return "OK";
  if (tone === "warning") return "A surveiller";
  if (tone === "danger") return "Urgent";
  return "A traiter";
}

function getDeadlineLabel(date: string) {
  const days = getDaysUntil(date);

  if (days < 0) return `Depassee de ${Math.abs(days)} j`;
  if (days === 0) return "Aujourd hui";
  if (days === 1) return "Demain";
  return `Dans ${days} j`;
}

function buildCashPilot({
  deals,
  fixedCosts,
  quotes,
  shows,
}: {
  deals: PipelineDeal[];
  fixedCosts: FixedCost[];
  quotes: QuoteItem[];
  shows: Show[];
}) {
  const activeShows = shows.filter((show) => show.status !== "En pause");
  const monthlyFixedCosts = getMonthlyFixedCostsTotal(fixedCosts);
  const currentCash = 18400;
  const expectedQuotes30 = quotes
    .filter((quote) => quote.dueDate && getDaysUntil(quote.dueDate) <= 30)
    .reduce((total, quote) => total + quote.depositDue + quote.balanceDue, 0);
  const weightedPipeline = deals
    .filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu")
    .reduce((total, deal) => total + getWeightedValue(deal), 0);
  const monthlyCreationPressure = activeShows.reduce(
    (total, show) => total + Math.round(show.budget * 0.04),
    0,
  );
  const monthlyBurn = monthlyFixedCosts + monthlyCreationPressure;
  const runwayDays = monthlyBurn > 0 ? Math.round((currentCash / monthlyBurn) * 30) : 180;
  const riskDate = addDays(new Date(), runwayDays);
  const status: Tone = runwayDays >= 90 ? "success" : runwayDays >= 45 ? "warning" : "danger";

  return {
    currentCash,
    expectedQuotes30,
    monthlyBurn,
    monthlyFixedCosts,
    riskDate,
    runwayDays,
    status,
    weightedPipeline,
  };
}

function buildTheatreActions({
  deals,
  documentMissingCount,
  grants,
  quotes,
  reminders,
}: {
  deals: PipelineDeal[];
  documentMissingCount: number;
  grants: GrantOpportunity[];
  quotes: QuoteItem[];
  reminders: Reminder[];
}) {
  const actions: TheatreAction[] = [];
  const lateReminder = reminders.find((reminder) => getDaysUntil(reminder.dueDate) < 0);
  const urgentGrant = [...grants]
    .filter((grant) => getDaysUntil(grant.deadline) >= 0)
    .sort((a, b) => getDaysUntil(a.deadline) - getDaysUntil(b.deadline))[0];
  const priorityDeal = deals
    .filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu")
    .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a))[0];
  const cashToCollect = quotes
    .filter((quote) => quote.dueDate && getDaysUntil(quote.dueDate) <= 30)
    .reduce((total, quote) => total + quote.depositDue + quote.balanceDue, 0);

  if (lateReminder) {
    actions.push({
      detail: lateReminder.relatedTo || "Relance sans contexte",
      href: "/reminders",
      label: "Relance",
      title: lateReminder.label,
      tone: "danger",
    });
  }

  if (urgentGrant) {
    const days = getDaysUntil(urgentGrant.deadline);
    actions.push({
      detail: `${urgentGrant.funder} - ${formatCurrency(urgentGrant.amount)}`,
      href: "/subventions",
      label: days <= 7 ? "Dossier urgent" : "Dossier a preparer",
      title: `${urgentGrant.title} - ${getDeadlineLabel(urgentGrant.deadline)}`,
      tone: days <= 7 ? "danger" : "warning",
    });
  }

  if (priorityDeal) {
    actions.push({
      detail: `${priorityDeal.contactName} - ${formatCurrency(getWeightedValue(priorityDeal))} ponderes`,
      href: "/pipeline",
      label: "Diffusion",
      title: priorityDeal.nextAction || priorityDeal.title,
      tone: "neutral",
    });
  }

  if (documentMissingCount > 0) {
    actions.push({
      detail: `${documentMissingCount} piece(s) manquante(s) dans les dossiers spectacle`,
      href: "/documents",
      label: "Dossiers",
      title: "Completer les pieces avant depot ou vente",
      tone: "warning",
    });
  }

  if (cashToCollect > 0) {
    actions.push({
      detail: `${formatCurrency(cashToCollect)} a encaisser sous 30 jours`,
      href: "/billing",
      label: "Tresorerie",
      title: "Suivre les acomptes et soldes",
      tone: "neutral",
    });
  }

  return actions.slice(0, 5);
}

function buildShowReadiness(shows: Show[], documents: ShowDocument[]) {
  return shows
    .map((show) => {
      const readiness = getShowDocumentReadiness(
        documents.filter((document) => document.showId === show.id),
      );

      return { readiness, show };
    })
    .sort((a, b) => a.readiness.percent - b.readiness.percent)
    .slice(0, 4);
}

export default async function DashboardPage() {
  const [{ contacts, pipelineDeals, reminders, shows }, grants, quotes, documents, fixedCosts] =
    await Promise.all([
      getDashboardData(),
      getGrantOpportunities(),
      getQuoteItems(),
      getShowDocuments(),
      getFixedCosts(),
    ]);

  const activeDeals = pipelineDeals
    .filter((deal) => deal.stage !== "Confirme" && deal.stage !== "Perdu")
    .sort((a, b) => getPipelinePriorityScore(b) - getPipelinePriorityScore(a));
  const priorityDeals = activeDeals.slice(0, 3);
  const priorityReminders = [...reminders]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);
  const activeShows = shows.filter((show) => show.status !== "En pause");
  const nextShows = [...activeShows]
    .sort((a, b) => new Date(a.nextDate || "2999-12-31").getTime() - new Date(b.nextDate || "2999-12-31").getTime())
    .slice(0, 3);
  const cashPilot = buildCashPilot({ deals: pipelineDeals, fixedCosts, quotes, shows });
  const showReadiness = buildShowReadiness(activeShows, documents);
  const documentMissingCount = showReadiness.reduce(
    (total, item) => total + item.readiness.missingCount,
    0,
  );
  const urgentGrantCount = grants.filter((grant) => {
    const days = getDaysUntil(grant.deadline);
    return days >= 0 && days <= 30;
  }).length;
  const overdueReminderCount = reminders.filter((reminder) => getDaysUntil(reminder.dueDate) < 0).length;
  const theatreActions = buildTheatreActions({
    deals: pipelineDeals,
    documentMissingCount,
    grants,
    quotes,
    reminders,
  });
  const mainAction = theatreActions[0] ?? null;
  const productionTone: Tone =
    documentMissingCount === 0 ? "success" : documentMissingCount <= 4 ? "warning" : "danger";
  const agendaTone: Tone =
    overdueReminderCount > 0 ? "danger" : urgentGrantCount > 0 ? "warning" : "success";
  const salesTone: Tone = activeDeals.length > 0 ? "success" : "warning";

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-panel-strong/55 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Cockpit du jour
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                  {cashPilot.status === "success"
                    ? "La compagnie tient le cap."
                    : cashPilot.status === "warning"
                      ? "La compagnie tient, mais il faut surveiller."
                      : "La compagnie risque de passer dans le rouge."}
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted">
                  Tresorerie, diffusion, dossiers et echeances reunis dans une seule lecture.
                </p>
              </div>
              <Badge tone={cashPilot.status}>{getToneLabel(cashPilot.status)}</Badge>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
            <PulseMetric
              detail={`${cashPilot.runwayDays} jours de marge`}
              label="Est-ce qu'on tient ?"
              tone={cashPilot.status}
              value={formatCurrency(cashPilot.currentCash)}
            />
            <PulseMetric
              detail={`${activeDeals.length} opportunite(s) active(s)`}
              label="Qu'est-ce qui vend ?"
              tone={salesTone}
              value={formatCurrency(cashPilot.weightedPipeline)}
            />
            <PulseMetric
              detail={`${documentMissingCount} piece(s) manquante(s)`}
              label="Qu'est-ce qui bloque ?"
              tone={productionTone}
              value={`${Math.max(0, activeShows.length - showReadiness.filter((item) => item.readiness.missingCount > 0).length)}/${activeShows.length}`}
            />
            <PulseMetric
              detail={`${overdueReminderCount} retard - ${urgentGrantCount} deadline(s)`}
              label="Qu'est-ce qui presse ?"
              tone={agendaTone}
              value={agendaTone === "success" ? "Calme" : getToneLabel(agendaTone)}
            />
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Priorite
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {mainAction?.title ?? "Rien ne bloque aujourd'hui."}
              </h2>
            </div>
            {mainAction ? <Badge tone={mainAction.tone}>{mainAction.label}</Badge> : null}
          </div>
          <p className="text-sm text-muted">
            {mainAction?.detail ??
              "Le cockpit restera clair tant que les relances, dossiers et encaissements restent a jour."}
          </p>
          <div className="flex flex-wrap gap-3">
            {mainAction ? (
              <ButtonLink href={mainAction.href}>Ouvrir</ButtonLink>
            ) : (
              <ButtonLink href="/pipeline">Ajouter une opportunite</ButtonLink>
            )}
            <ButtonLink href="/calendar" variant="secondary">
              Voir l&apos;agenda
            </ButtonLink>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Plan de route
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Les 5 sorties utiles</h2>
          </div>
          {theatreActions.length === 0 ? (
            <EmptyBlock text="Aucune sortie critique pour le moment." />
          ) : (
            <div className="space-y-3">
              {theatreActions.map((action, index) => (
                <Link
                  key={`${action.href}-${action.title}`}
                  className="grid gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/35 hover:bg-panel-strong/60 sm:grid-cols-[2.25rem_1fr_auto]"
                  href={action.href}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-panel text-sm font-semibold text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{action.title}</span>
                    <span className="mt-1 block text-sm text-muted">{action.detail}</span>
                  </span>
                  <Badge className="self-start" tone={action.tone}>
                    {action.label}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <WorkflowCard
            detail={`${priorityDeals.length} dossier(s) de diffusion a pousser`}
            href="/pipeline"
            label="Vendre"
            title="Transformer les contacts en dates"
            value={formatCurrency(cashPilot.weightedPipeline)}
          />
          <WorkflowCard
            detail={`${urgentGrantCount} echeance(s) subvention a moins de 30 jours`}
            href="/subventions"
            label="Financer"
            title="Chercher l'argent qui evite le rouge"
            value={formatCurrency(cashPilot.expectedQuotes30)}
          />
          <WorkflowCard
            detail={`${documentMissingCount} piece(s) a completer`}
            href="/documents"
            label="Produire"
            title="Rendre les spectacles deposables"
            value={`${showReadiness.filter((item) => item.readiness.missingCount === 0).length} pret(s)`}
          />
          <WorkflowCard
            detail={`${cashPilot.monthlyFixedCosts.toLocaleString("fr-FR")} EUR de frais fixes mensuels`}
            href="/finances"
            label="Piloter"
            title="Voir quand la tresorerie se tend"
            value={cashPilot.riskDate.toLocaleDateString("fr-FR")}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Spectacles
              </p>
              <h2 className="mt-2 text-xl font-semibold">Ce qui peut etre vendu ou depose</h2>
            </div>
            <ButtonLink href="/shows" variant="secondary">
              Tous les spectacles
            </ButtonLink>
          </div>

          {nextShows.length === 0 ? (
            <EmptyBlock text="Aucun spectacle actif pour le moment." />
          ) : (
            <div className="space-y-3">
              {nextShows.map((show) => {
                const readiness = getShowDocumentReadiness(
                  documents.filter((document) => document.showId === show.id),
                );

                return (
                  <Link
                    key={show.id}
                    className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/35 hover:bg-panel-strong/60"
                    href={`/shows/${show.id}`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-medium">{show.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          {show.discipline} -{" "}
                          {show.nextDate
                            ? new Date(show.nextDate).toLocaleDateString("fr-FR")
                            : "Date a poser"}
                        </p>
                      </div>
                      <Badge tone={getShowTone(show)}>{show.status}</Badge>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted">
                        <span>Dossier</span>
                        <span>
                          {readiness.percent}% - {readiness.missingCount} manquant(s)
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${readiness.percent}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Diffusion
              </p>
              <h2 className="mt-2 text-xl font-semibold">Les dates a faire avancer</h2>
            </div>
            <ButtonLink href="/pipeline" variant="secondary">
              Pipeline
            </ButtonLink>
          </div>

          {priorityDeals.length === 0 ? (
            <EmptyBlock text="Aucune opportunite active." />
          ) : (
            <div className="space-y-3">
              {priorityDeals.map((deal) => (
                <Link
                  key={deal.id}
                  className="block rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/35 hover:bg-panel-strong/60"
                  href="/pipeline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{deal.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {deal.contactName} - {deal.showTitle}
                      </p>
                    </div>
                    <Badge>{deal.stage}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted">Valeur ponderee</p>
                      <p className="mt-1 font-medium">{formatCurrency(getWeightedValue(deal))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Prochaine relance</p>
                      <p className="mt-1 font-medium">
                        {deal.nextFollowUpAt
                          ? new Date(deal.nextFollowUpAt).toLocaleDateString("fr-FR")
                          : "A poser"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {deal.nextAction || "Prochaine action a definir"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Aujourd&apos;hui
              </p>
              <h2 className="mt-2 text-xl font-semibold">Relances et echeances</h2>
            </div>
            <ButtonLink href="/reminders" variant="secondary">
              A faire
            </ButtonLink>
          </div>

          {priorityReminders.length === 0 ? (
            <EmptyBlock text="Aucune relance ouverte." />
          ) : (
            <div className="space-y-3">
              {priorityReminders.map((reminder) => (
                <Link
                  key={reminder.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/35 hover:bg-panel-strong/60 sm:flex-row sm:items-center sm:justify-between"
                  href="/reminders"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{reminder.label}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {reminder.relatedTo || "Sans contexte"}
                    </span>
                  </span>
                  <Badge tone={getReminderTone(reminder)}>{getReminderLabel(reminder)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Repertoire
              </p>
              <h2 className="mt-2 text-xl font-semibold">Contacts a activer</h2>
            </div>
            <ButtonLink href="/contacts" variant="secondary">
              Contacts
            </ButtonLink>
          </div>

          {contacts.length === 0 ? (
            <EmptyBlock text="Aucun contact cree." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.slice(0, 4).map((contact) => (
                <Link
                  key={contact.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/35 hover:bg-panel-strong/60"
                  href={`/contacts/${contact.id}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{contact.name}</span>
                    <span className="mt-1 block truncate text-sm text-muted">
                      {[contact.organization, contact.city].filter(Boolean).join(" - ") ||
                        "Contact sans detail"}
                    </span>
                  </span>
                  <Badge>{contact.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      {contacts.length === 0 && shows.length === 0 && pipelineDeals.length === 0 && reminders.length === 0 ? (
        <EmptyState
          title="Le cockpit attend les premieres donnees"
          description="Un spectacle, quelques contacts et une opportunite suffisent pour faire remonter les priorites."
        />
      ) : null}
    </div>
  );
}

function PulseMetric({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <div className="border-t border-border p-4 md:border-r xl:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span
          className={[
            "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
            tone === "success"
              ? "bg-success"
              : tone === "warning"
                ? "bg-warning"
                : tone === "danger"
                  ? "bg-danger"
                  : "bg-accent",
          ].join(" ")}
        />
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function WorkflowCard({
  detail,
  href,
  label,
  title,
  value,
}: {
  detail: string;
  href: string;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-panel p-5 shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-panel-strong/55"
      href={href}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
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
