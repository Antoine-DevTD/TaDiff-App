"use client";

import { useMemo, useState, useTransition } from "react";
import { completeReminder } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Reminder } from "@/types";

type ReminderFilter = "all" | "late" | "today" | "week";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getReminderTone(reminder: Reminder) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(reminder.dueDate));

  if (reminder.done) return "success";
  if (due < today) return "danger";
  if (due.getTime() === today.getTime()) return "warning";
  if (reminder.priority === "high") return "warning";
  return "neutral";
}

function getReminderWeight(reminder: Reminder) {
  if (reminder.done) return 4;

  const tone = getReminderTone(reminder);

  if (tone === "danger") return 0;
  if (tone === "warning") return 1;
  if (reminder.priority === "high") return 2;
  return 3;
}

function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort((a, b) => {
    const weightDiff = getReminderWeight(a) - getReminderWeight(b);

    if (weightDiff !== 0) {
      return weightDiff;
    }

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

function getPriorityLabel(priority: Reminder["priority"]) {
  if (priority === "high") return "Urgent";
  if (priority === "low") return "Faible";
  return "Normal";
}

function getDueLabel(reminder: Reminder) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(reminder.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `En retard de ${Math.abs(diffDays)} j`;
  }

  if (diffDays === 0) {
    return "A faire aujourd'hui";
  }

  if (diffDays === 1) {
    return "Demain";
  }

  if (diffDays <= 7) {
    return `Dans ${diffDays} j`;
  }

  return new Date(reminder.dueDate).toLocaleDateString("fr-FR");
}

function isReminderInFilter(reminder: Reminder, filter: ReminderFilter) {
  const today = startOfDay(new Date());
  const weekEnd = startOfDay(addDays(today, 7));
  const due = startOfDay(new Date(reminder.dueDate));

  if (filter === "late") return due < today;
  if (filter === "today") return due.getTime() === today.getTime();
  if (filter === "week") return due > today && due <= weekEnd;
  return true;
}

function partitionReminders(reminders: Reminder[]) {
  const today = startOfDay(new Date());
  const weekEnd = startOfDay(addDays(today, 7));

  return reminders.reduce(
    (acc, reminder) => {
      const due = startOfDay(new Date(reminder.dueDate));

      if (due < today) {
        acc.late.push(reminder);
      } else if (due.getTime() === today.getTime()) {
        acc.today.push(reminder);
      } else if (due <= weekEnd) {
        acc.week.push(reminder);
      } else {
        acc.later.push(reminder);
      }

      return acc;
    },
    { late: [] as Reminder[], today: [] as Reminder[], week: [] as Reminder[], later: [] as Reminder[] },
  );
}

export function RemindersWorkspace({ reminders }: { reminders: Reminder[] }) {
  const [items, setItems] = useState(() => sortReminders(reminders));
  const [filter, setFilter] = useState<ReminderFilter>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((reminder) => {
      if (!isReminderInFilter(reminder, filter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [reminder.label, reminder.relatedTo].join(" ").toLowerCase().includes(normalizedSearch);
    });
  }, [filter, items, search]);

  const sections = useMemo(() => partitionReminders(visibleItems), [visibleItems]);
  const allSections = useMemo(() => partitionReminders(items), [items]);
  const focusReminder = visibleItems[0] ?? null;

  function markDone(id: string) {
    setItems((current) =>
      sortReminders(current.map((item) => (item.id === id ? { ...item, done: true } : item))),
    );

    startTransition(async () => {
      await completeReminder(id);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="En retard" value={allSections.late.length.toString()} tone="danger" />
        <MetricCard label="Aujourd'hui" value={allSections.today.length.toString()} tone="warning" />
        <MetricCard label="Cette semaine" value={allSections.week.length.toString()} tone="neutral" />
        <MetricCard
          label="Total ouvert"
          value={items.filter((item) => !item.done).length.toString()}
          tone="success"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_0.95fr]">
        <div className="space-y-5">
          <Card className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Vue execution</p>
                <p className="mt-1 text-sm text-muted">
                  Traitez en premier le retard, puis les relances du jour.
                </p>
              </div>
              <Input
                aria-label="Rechercher une relance"
                className="lg:max-w-sm"
                placeholder="Rechercher une relance..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "Tout" },
                { id: "late", label: "En retard" },
                { id: "today", label: "Aujourd'hui" },
                { id: "week", label: "Cette semaine" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={
                    filter === item.id
                      ? "rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted hover:bg-panel-strong hover:text-foreground"
                  }
                  type="button"
                  onClick={() => setFilter(item.id as ReminderFilter)}
                >
                  {item.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted">
                {visibleItems.length} resultat{visibleItems.length > 1 ? "s" : ""}
              </span>
            </div>
          </Card>

          <ReminderSection
            title="En retard"
            description="A traiter en premier."
            reminders={sections.late}
            emptyLabel="Aucune relance en retard."
            isPending={isPending}
            onDone={markDone}
          />
          <ReminderSection
            title="Aujourd'hui"
            description="Les relances a sortir aujourd'hui."
            reminders={sections.today}
            emptyLabel="Rien a faire aujourd'hui."
            isPending={isPending}
            onDone={markDone}
          />
          <ReminderSection
            title="Cette semaine"
            description="Les prochaines actions deja planifiees."
            reminders={sections.week}
            emptyLabel="Aucune relance cette semaine."
            isPending={isPending}
            onDone={markDone}
          />
          <ReminderSection
            title="Plus tard"
            description="Le reste, deja sous controle."
            reminders={sections.later}
            emptyLabel="Aucune relance plus lointaine."
            isPending={isPending}
            onDone={markDone}
          />
        </div>

        <div className="space-y-5">
          <Card className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus</p>
                <p className="mt-2 text-lg font-semibold">
                  {focusReminder ? focusReminder.label : "Aucune urgence ouverte"}
                </p>
              </div>
              {focusReminder ? <Badge tone={getReminderTone(focusReminder)}>{getDueLabel(focusReminder)}</Badge> : null}
            </div>
            <p className="text-sm text-muted">
              {focusReminder?.relatedTo || "Aucune relance prioritaire a traiter pour le moment."}
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-panel-strong/55 p-3 text-sm">
              <div>
                <p className="text-xs text-muted">Priorite</p>
                <p className="mt-1 font-medium">
                  {focusReminder ? getPriorityLabel(focusReminder.priority) : "Aucune"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Echeance</p>
                <p className="mt-1 font-medium">
                  {focusReminder
                    ? new Date(focusReminder.dueDate).toLocaleDateString("fr-FR")
                    : "--"}
                </p>
              </div>
            </div>
            <ButtonLink className="w-full" href="/pipeline" variant="secondary">
              Ouvrir le pipeline
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReminderSection({
  description,
  emptyLabel,
  isPending,
  onDone,
  reminders,
  title,
}: {
  description: string;
  emptyLabel: string;
  isPending: boolean;
  onDone: (id: string) => void;
  reminders: Reminder[];
  title: string;
}) {
  return (
    <Card className="space-y-4 p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{title}</p>
          <Badge tone="neutral">{reminders.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      {reminders.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <article
              key={reminder.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-panel-strong/35 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{reminder.label}</p>
                  <Badge tone={getReminderTone(reminder)}>
                    {reminder.done ? "Fait" : getPriorityLabel(reminder.priority)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{reminder.relatedTo || "Sans contexte"}</span>
                  <span>•</span>
                  <span>{new Date(reminder.dueDate).toLocaleDateString("fr-FR")}</span>
                  <span>•</span>
                  <span>{getDueLabel(reminder)}</span>
                </div>
              </div>
              <button
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
                disabled={reminder.done || isPending}
                type="button"
                onClick={() => onDone(reminder.id)}
              >
                Marquer fait
              </button>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "danger" | "warning" | "neutral" | "success";
  value: string;
}) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </Card>
  );
}
