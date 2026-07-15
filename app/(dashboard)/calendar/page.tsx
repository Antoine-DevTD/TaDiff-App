import Link from "next/link";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCalendarEvents,
  getFixedCosts,
  getGrantOpportunities,
  getReminders,
  getShows,
} from "@/lib/supabase/queries";

type CalendarItem = {
  id: string;
  date: string;
  href: string;
  kind: "fixed-cost" | "grant" | "show" | "reminder" | "event" | "deadline";
  label: string;
  meta: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getReminderTone(date: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(date));

  if (due < today) return "danger" as const;
  if (due.getTime() === today.getTime()) return "warning" as const;
  return "neutral" as const;
}

function getReminderLabel(date: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(date));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Retard ${Math.abs(diffDays)} j`;
  if (diffDays === 0) return "Aujourd hui";
  if (diffDays === 1) return "Demain";
  if (diffDays <= 7) return `Dans ${diffDays} j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

function buildCalendarItems({
  events,
  fixedCosts,
  grants,
  reminders,
  shows,
}: {
  events: Awaited<ReturnType<typeof getCalendarEvents>>;
  fixedCosts: Awaited<ReturnType<typeof getFixedCosts>>;
  grants: Awaited<ReturnType<typeof getGrantOpportunities>>;
  reminders: Awaited<ReturnType<typeof getReminders>>;
  shows: Awaited<ReturnType<typeof getShows>>;
}): CalendarItem[] {
  const eventItems: CalendarItem[] = events.map((event) => ({
    id: `event-${event.id}`,
    date: event.eventDate,
    href: "/calendar",
    kind: event.kind,
    label: event.title,
    meta: event.note || (event.kind === "deadline" ? "Deadline perso" : "Evenement"),
    tone: event.kind === "deadline" ? "danger" : "success",
  }));
  const reminderItems: CalendarItem[] = reminders.map((reminder) => ({
    id: `reminder-${reminder.id}`,
    date: reminder.dueDate,
    href: "/reminders",
    kind: "reminder",
    label: reminder.label,
    meta: reminder.relatedTo || "Action",
    tone: getReminderTone(reminder.dueDate),
  }));

  const showItems: CalendarItem[] = shows
    .filter((show) => show.nextDate)
    .map((show) => ({
      id: `show-${show.id}`,
      date: show.nextDate,
      href: `/shows/${show.id}`,
      kind: "show",
      label: show.title,
      meta: `${show.discipline} - ${show.status}`,
      tone: show.status === "En diffusion" ? "success" : "neutral",
    }));

  const grantItems: CalendarItem[] = grants.map((grant) => ({
    id: `grant-${grant.id}`,
    date: grant.deadline,
    href: "/subventions",
    kind: "grant",
    label: grant.title,
    meta: `${grant.funder} - ${grant.status}`,
    tone: getReminderTone(grant.deadline),
  }));

  const fixedCostItems: CalendarItem[] = fixedCosts.map((cost) => ({
    id: `fixed-cost-${cost.id}`,
    date: cost.nextDueDate,
    href: "/finances",
    kind: "fixed-cost",
    label: cost.label,
    meta: `${cost.category} - ${cost.frequency}`,
    tone: getReminderTone(cost.nextDueDate),
  }));

  return [...reminderItems, ...showItems, ...grantItems, ...fixedCostItems, ...eventItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export default async function CalendarPage() {
  const [shows, reminders, grants, fixedCosts, events] = await Promise.all([
    getShows(),
    getReminders(),
    getGrantOpportunities(),
    getFixedCosts(),
    getCalendarEvents(),
  ]);
  const items = buildCalendarItems({ events, fixedCosts, grants, reminders, shows });
  const upcomingItems = items.slice(0, 5);

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <EmptyState
          title="Aucune echeance"
          description="Ajoutez une action ou une prochaine date spectacle pour alimenter le planning."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Actions ouvertes"
              value={reminders.length.toString()}
              detail={
                reminders.length === 0
                  ? "Aucune action ouverte"
                  : `${reminders.filter((reminder) => getReminderTone(reminder.dueDate) === "danger").length} en retard`
              }
            />
            <MetricCard
              label="Dates spectacle"
              value={shows.filter((show) => show.nextDate).length.toString()}
              detail="Prochaines sorties programmees"
            />
            <MetricCard
              label="Subventions"
              value={grants.length.toString()}
              detail="Deadlines integrees"
            />
            <MetricCard
              label="Frais fixes"
              value={fixedCosts.length.toString()}
              detail="Echeances recurrentes"
            />
          </section>

          <Card className="p-5">
            <CalendarBoard
              items={items}
              shows={shows.map((show) => ({ id: show.id, title: show.title }))}
            />
          </Card>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="space-y-4 p-5" data-tour="calendrier-avenir">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">A venir</p>
                  <p className="mt-1 text-sm text-muted">Les 5 prochaines echeances a traiter.</p>
                </div>
              </div>
              <div className="space-y-3">
                {upcomingItems.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">Acces rapides</p>
                  <p className="mt-1 text-sm text-muted">Aller directement sur la bonne vue de travail.</p>
                </div>
              </div>
              <div className="grid gap-3">
                <QuickLink
                  href="/reminders"
                  title="Voir les actions"
                  detail="Traiter le retard, aujourd hui, puis la semaine."
                />
                <QuickLink
                  href="/pipeline"
                  title="Voir les dates a vendre"
                  detail="Planifier les prochaines actions et alimenter le calendrier."
                />
                <QuickLink
                  href="/shows"
                  title="Mettre a jour les spectacles"
                  detail="Corriger les prochaines dates et suivre les ventes."
                />
              </div>
            </Card>
          </section>
        </>
      )}
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

function getKindLabel(kind: CalendarItem["kind"]) {
  if (kind === "reminder") return "Action";
  if (kind === "grant") return "Subvention";
  if (kind === "fixed-cost") return "Frais fixe";
  if (kind === "deadline") return "Deadline";
  if (kind === "event") return "Evenement";
  return "Spectacle";
}

function TimelineRow({ item }: { item: CalendarItem }) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={item.href}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.label}</p>
          <Badge tone={item.tone}>{getKindLabel(item.kind)}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {item.meta} - {new Date(item.date).toLocaleDateString("fr-FR")}
        </p>
      </div>
      <Badge tone={item.tone}>
        {item.kind === "reminder" || item.kind === "grant" || item.kind === "fixed-cost"
          ? getReminderLabel(item.date)
          : "Date programmee"}
      </Badge>
    </Link>
  );
}

function QuickLink({
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
