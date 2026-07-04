import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getFixedCosts,
  getGrantOpportunities,
  getReminders,
  getShows,
} from "@/lib/supabase/queries";

type CalendarItem = {
  id: string;
  date: string;
  href: string;
  kind: "fixed-cost" | "grant" | "show" | "reminder";
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

function getMonthKey(date: string) {
  const current = new Date(date);
  const month = current.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function buildCalendarItems({
  fixedCosts,
  grants,
  reminders,
  shows,
}: {
  fixedCosts: Awaited<ReturnType<typeof getFixedCosts>>;
  grants: Awaited<ReturnType<typeof getGrantOpportunities>>;
  reminders: Awaited<ReturnType<typeof getReminders>>;
  shows: Awaited<ReturnType<typeof getShows>>;
}): CalendarItem[] {
  const reminderItems: CalendarItem[] = reminders.map((reminder) => ({
    id: `reminder-${reminder.id}`,
    date: reminder.dueDate,
    href: "/reminders",
    kind: "reminder",
    label: reminder.label,
    meta: reminder.relatedTo || "Relance",
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

  return [...reminderItems, ...showItems, ...grantItems, ...fixedCostItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export default async function CalendarPage() {
  const [shows, reminders, grants, fixedCosts] = await Promise.all([
    getShows(),
    getReminders(),
    getGrantOpportunities(),
    getFixedCosts(),
  ]);
  const items = buildCalendarItems({ fixedCosts, grants, reminders, shows });
  const upcomingItems = items.slice(0, 5);
  const groupedByMonth = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const key = getMonthKey(item.date);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Calendrier</h2>
        <p className="mt-1 text-sm text-muted">
          Une seule vue pour les relances a sortir et les prochaines dates spectacle.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Aucune echeance"
          description="Ajoutez une relance ou une prochaine date spectacle pour alimenter le planning."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Relances ouvertes"
              value={reminders.length.toString()}
              detail={
                reminders.length === 0
                  ? "Aucune relance ouverte"
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

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="space-y-4 p-5">
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
                  title="Executer les relances"
                  detail="Traiter le retard, aujourd hui, puis la semaine."
                />
                <QuickLink
                  href="/pipeline"
                  title="Revenir a la diffusion"
                  detail="Planifier les prochaines actions et alimenter le calendrier."
                />
                <QuickLink
                  href="/shows"
                  title="Mettre a jour les spectacles"
                  detail="Corriger les prochaines dates et suivre la diffusion."
                />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            {Object.entries(groupedByMonth).map(([month, monthItems]) => (
              <Card key={month} className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{month}</p>
                    <p className="mt-1 text-sm text-muted">{monthItems.length} echeance(s)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {monthItems.map((item) => (
                    <MonthRow key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            ))}
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

function TimelineRow({ item }: { item: CalendarItem }) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 transition hover:border-accent/30 hover:bg-panel-strong/55"
      href={item.href}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.label}</p>
          <Badge tone={item.tone}>
            {item.kind === "reminder"
              ? "Relance"
              : item.kind === "grant"
                ? "Subvention"
                : item.kind === "fixed-cost"
                  ? "Frais fixe"
                  : "Spectacle"}
          </Badge>
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

function MonthRow({ item }: { item: CalendarItem }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.label}</p>
          <Badge tone={item.tone}>
            {item.kind === "reminder"
              ? "Relance"
              : item.kind === "grant"
                ? "Subvention"
                : item.kind === "fixed-cost"
                  ? "Frais fixe"
                  : "Spectacle"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{item.meta}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">
            {new Date(item.date).toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {item.kind === "reminder" || item.kind === "grant" || item.kind === "fixed-cost"
              ? getReminderLabel(item.date)
              : "Prochaine date"}
          </p>
        </div>
        <ButtonLink href={item.href} variant="secondary">
          Ouvrir
        </ButtonLink>
      </div>
    </div>
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
