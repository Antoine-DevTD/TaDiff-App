"use client";

import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Drama,
  Landmark,
  MapPin,
  Plus,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildIcsCalendar } from "@/lib/calendar-ics";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventKind } from "@/types";

export type CalendarBoardItem = {
  id: string;
  date: string;
  href: string;
  kind: "fixed-cost" | "grant" | "show" | "reminder" | "event" | "deadline";
  label: string;
  meta: string;
  tone: "neutral" | "success" | "warning" | "danger";
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string;
  relatedShowId?: string;
  relatedShowTitle?: string;
};

type CalendarGroup = "all" | "show" | "reminder" | "funding" | "finance" | "event";
type CalendarView = "month" | "week";
type EventDraft = {
  date: string;
  kind: CalendarEventKind;
  title: string;
  relatedShowId: string;
  note: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
};

const weekdayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const kindStyles: Record<CalendarBoardItem["kind"], { chip: string; dot: string; label: string }> = {
  show: { chip: "border-accent/20 bg-accent/10 text-accent", dot: "bg-accent", label: "Représentation" },
  reminder: { chip: "border-warning/25 bg-warning/10 text-warning", dot: "bg-warning", label: "Action" },
  grant: { chip: "border-danger/20 bg-danger/10 text-danger", dot: "bg-danger", label: "Subvention" },
  "fixed-cost": { chip: "border-border bg-panel-strong text-foreground", dot: "bg-muted", label: "Frais fixe" },
  event: { chip: "border-success/20 bg-success/10 text-success", dot: "bg-success", label: "Événement" },
  deadline: { chip: "border-danger/20 bg-danger/10 text-danger", dot: "bg-danger", label: "Échéance" },
};

const filters: Array<{ id: CalendarGroup; label: string }> = [
  { id: "all", label: "Tout" },
  { id: "show", label: "Représentations" },
  { id: "reminder", label: "Actions" },
  { id: "funding", label: "Subventions" },
  { id: "finance", label: "Frais" },
  { id: "event", label: "Compagnie" },
];

const eventKinds: Array<{ id: CalendarEventKind; label: string; description: string }> = [
  { id: "show", label: "Représentation", description: "Une date jouée, avec horaires et lieu." },
  { id: "event", label: "Événement", description: "Répétition, rendez-vous ou vie de compagnie." },
  { id: "deadline", label: "Échéance", description: "Un dépôt ou une date limite à ne pas rater." },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function groupMatches(item: CalendarBoardItem, group: CalendarGroup) {
  if (group === "all") return true;
  if (group === "funding") return item.kind === "grant";
  if (group === "finance") return item.kind === "fixed-cost";
  if (group === "event") return item.kind === "event" || item.kind === "deadline";
  return item.kind === group;
}

function eventToBoardItem(event: CalendarEvent): CalendarBoardItem {
  return {
    id: `event-${event.id}`,
    date: event.eventDate,
    href: "/calendar",
    kind: event.kind,
    label: event.title,
    meta: event.note || event.location || "Événement de la compagnie",
    tone: event.kind === "deadline" ? "danger" : "success",
    allDay: event.allDay,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
  };
}

function emptyDraft(date: string, shows: Array<{ id: string; title: string }>): EventDraft {
  return {
    date,
    kind: "event",
    title: "",
    relatedShowId: shows[0]?.id ?? "",
    note: "",
    allDay: true,
    startTime: "19:00",
    endTime: "20:30",
    location: "",
  };
}

export function CalendarBoard({
  items: initialItems,
  shows = [],
}: {
  items: CalendarBoardItem[];
  shows?: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<CalendarView>("month");
  const [filter, setFilter] = useState<CalendarGroup>("all");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const visibleItems = useMemo(
    () => items.filter((item) => groupMatches(item, filter)),
    [filter, items],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarBoardItem[]>();
    for (const item of visibleItems) {
      const key = dateKey(parseDate(item.date));
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [visibleItems]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => {
    if (view === "week") {
      const weekStart = addDays(cursor, -mondayIndex(cursor));
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = addDays(first, -mondayIndex(first));
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor, view]);

  const title = useMemo(() => {
    if (view === "week") {
      const start = addDays(cursor, -mondayIndex(cursor));
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    const label = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor, view]);

  const upcoming = useMemo(
    () =>
      visibleItems
        .filter((item) => parseDate(item.date) >= today)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, 8),
    [today, visibleItems],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const mobileDays = useMemo(() => {
    const inCurrentPeriod = days.filter((day) =>
      view === "week" ? true : day.getMonth() === cursor.getMonth(),
    );
    const usefulDays = inCurrentPeriod.filter((day) => {
      const isToday = day.getTime() === today.getTime();
      return isToday || (itemsByDay.get(dateKey(day))?.length ?? 0) > 0;
    });
    return usefulDays.length > 0 ? usefulDays : [inCurrentPeriod[0] ?? today];
  }, [cursor, days, itemsByDay, today, view]);

  function openDraft(date = toIsoDate(today)) {
    setError(null);
    setDraft(emptyDraft(date, shows));
  }

  function updateDraft(values: Partial<EventDraft>) {
    setDraft((current) => (current ? { ...current, ...values } : current));
  }

  function selectKind(kind: CalendarEventKind) {
    if (!draft) return;
    updateDraft({
      kind,
      allDay: kind === "show" ? false : draft.allDay,
      title: kind === "show" ? "" : draft.title,
    });
  }

  function move(direction: -1 | 1) {
    setCursor((current) =>
      view === "week"
        ? addDays(current, direction * 7)
        : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function submitDraft() {
    if (!draft) return;
    const title =
      draft.kind === "show" && !draft.title
        ? shows.find((show) => show.id === draft.relatedShowId)?.title ?? "Représentation"
        : draft.title;

    if (!title.trim()) {
      setError("Donnez un titre à cet événement.");
      return;
    }

    startSaving(async () => {
      const result = await createCalendarEvent({
        ...draft,
        title,
        eventDate: draft.date,
        relatedShowId: draft.kind === "show" ? draft.relatedShowId : "",
      });
      if (!result.ok || !result.calendarEvent) {
        setError(result.message);
        return;
      }
      setItems((current) => [...current, eventToBoardItem(result.calendarEvent!)].sort((a, b) => a.date.localeCompare(b.date)));
      setDraft(null);
    });
  }

  function exportIcs() {
    const ics = buildIcsCalendar(
      visibleItems.map((item) => ({
        uid: `${item.id}@tadiff`,
        date: item.date,
        summary: `${kindStyles[item.kind].label} - ${item.label}`,
        description: item.meta,
      })),
      "TaDiff - Agenda",
    );
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tadiff-agenda.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-panel shadow-sm">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Button className="h-10 w-10 p-0" variant="secondary" type="button" onClick={() => move(-1)} aria-label="Période précédente">
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </Button>
              <Button className="h-10 w-10 p-0" variant="secondary" type="button" onClick={() => move(1)} aria-label="Période suivante">
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Button>
              <button className="ml-1 truncate text-left text-xl font-semibold hover:text-accent" type="button" onClick={() => setCursor(today)}>
                {title}
              </button>
              <Button className="ml-2 hidden sm:inline-flex" variant="secondary" type="button" onClick={() => setCursor(today)}>
                Aujourd&apos;hui
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-panel-strong/45 p-1" aria-label="Vue du calendrier">
                {(["month", "week"] as CalendarView[]).map((mode) => (
                  <button
                    key={mode}
                    className={cn(
                      "min-h-8 rounded px-3 text-sm font-medium text-muted transition-colors",
                      view === mode && "bg-panel text-foreground shadow-sm",
                    )}
                    type="button"
                    onClick={() => setView(mode)}
                  >
                    {mode === "month" ? "Mois" : "Semaine"}
                  </button>
                ))}
              </div>
              <Button className="h-10 w-10 p-0" variant="secondary" type="button" onClick={exportIcs} title="Exporter l'agenda">
                <Download className="h-4 w-4" aria-hidden />
              </Button>
              <Button className="gap-2" type="button" onClick={() => openDraft()}>
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => {
              const count = items.filter((calendarItem) => groupMatches(calendarItem, item.id)).length;
              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/30 hover:text-foreground",
                    filter === item.id && "border-accent/25 bg-accent/10 text-accent",
                  )}
                  type="button"
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className="text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[48rem]">
              <div className="grid grid-cols-7 border-b border-border bg-panel-strong/35">
                {weekdayLabels.map((label) => (
                  <div key={label} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = dateKey(day);
                  const dayItems = itemsByDay.get(key) ?? [];
                  const isToday = day.getTime() === today.getTime();
                  const isOtherMonth = view === "month" && day.getMonth() !== cursor.getMonth();
                  const maxVisible = view === "week" ? 9 : 3;

                  return (
                    <div
                      key={key}
                      data-calendar-date={toIsoDate(day)}
                      className={cn(
                        "group/day relative min-h-36 border-b border-r border-border p-2.5 transition-colors hover:bg-accent/[0.035]",
                        view === "week" && "min-h-[34rem]",
                        isOtherMonth && "bg-panel-strong/25 text-muted",
                      )}
                      onClick={() => openDraft(toIsoDate(day))}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openDraft(toIsoDate(day));
                      }}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className={cn("inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-semibold", isToday && "bg-accent text-white shadow-sm shadow-accent/25")}>
                          {day.getDate()}
                        </span>
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-accent/10 hover:text-accent focus:opacity-100 group-hover/day:opacity-100"
                          type="button"
                          aria-label={`Ajouter le ${day.toLocaleDateString("fr-FR")}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDraft(toIsoDate(day));
                          }}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {dayItems.slice(0, maxVisible).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-1.5 overflow-hidden rounded-md border px-2 py-1.5 text-left text-xs transition hover:-translate-y-px hover:shadow-sm",
                              kindStyles[item.kind].chip,
                              selectedItemId === item.id && "ring-2 ring-accent ring-offset-1 ring-offset-panel",
                            )}
                            title={`${item.label} - ${item.meta}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                          >
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", kindStyles[item.kind].dot)} />
                            {item.startTime ? <span className="shrink-0 font-semibold">{item.startTime.slice(0, 5)}</span> : null}
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                        {dayItems.length > maxVisible ? <p className="px-2 text-xs text-muted">+ {dayItems.length - maxVisible} autres</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="divide-y divide-border md:hidden">
            {mobileDays.map((day) => {
              const dayItems = itemsByDay.get(dateKey(day)) ?? [];
              const isToday = day.getTime() === today.getTime();

              return (
                <section key={dateKey(day)} className="grid grid-cols-[4.25rem_1fr] gap-3 px-4 py-4">
                  <button
                    className="text-left"
                    type="button"
                    onClick={() => openDraft(toIsoDate(day))}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openDraft(toIsoDate(day));
                    }}
                  >
                    <span className="block text-xs font-semibold uppercase text-muted">
                      {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className={cn("mt-1 inline-flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-lg font-semibold", isToday && "bg-accent text-white")}>
                      {day.getDate()}
                    </span>
                  </button>
                  <div className="min-w-0 space-y-2">
                    {dayItems.length === 0 ? (
                      <button className="flex min-h-11 w-full items-center gap-2 rounded-md border border-dashed border-border px-3 text-left text-sm text-muted" type="button" onClick={() => openDraft(toIsoDate(day))}>
                        <Plus className="h-4 w-4" aria-hidden />
                        Ajouter à cette journée
                      </button>
                    ) : (
                      dayItems.map((item) => (
                        <button
                          key={item.id}
                          className={cn("flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm", kindStyles[item.kind].chip)}
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", kindStyles[item.kind].dot)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.label}</span>
                            <span className="mt-0.5 block truncate text-xs opacity-75">{formatSchedule(item)}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="border-t border-border bg-panel-strong/28 p-4 xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {selectedItem ? kindStyles[selectedItem.kind].label : "En approche"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedItem ? "Détail sélectionné" : "Les prochaines dates"}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-accent" aria-hidden />
            </div>
            {selectedItem ? (
              <div className="mt-4 rounded-lg border border-accent/25 bg-panel p-4 shadow-sm ring-1 ring-accent/10">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", kindStyles[selectedItem.kind].dot)} />
                  <div className="min-w-0">
                    <p className="font-semibold leading-5">{selectedItem.label}</p>
                    <p className="mt-1 text-sm text-muted">{selectedItem.meta}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Date</dt>
                    <dd className="mt-1 font-medium">{parseDate(selectedItem.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{selectedItem.allDay ? "Type" : "Horaire"}</dt>
                    <dd className="mt-1 font-medium">{formatSchedule(selectedItem)}</dd>
                  </div>
                </dl>
                {selectedItem.relatedShowTitle ? (
                  <div className="mt-3 rounded-md bg-accent/8 px-3 py-2">
                    <p className="text-xs text-muted">Spectacle concerné</p>
                    <p className="mt-0.5 text-sm font-semibold text-accent">{selectedItem.relatedShowTitle}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button type="button" className="flex-1" onClick={() => router.push(selectedItem.href)}>
                    {selectedItem.kind === "grant" ? "Ouvrir la subvention" : "Ouvrir"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSelectedItemId(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            ) : null}
            <div className={cn("space-y-2", selectedItem ? "mt-5 border-t border-border pt-4" : "mt-4")}>
              {upcoming.length === 0 ? (
                <button className="w-full rounded-md border border-dashed border-border p-4 text-left text-sm text-muted hover:border-accent/35 hover:text-foreground" type="button" onClick={() => openDraft()}>
                  Rien à venir. Ajouter une première date.
                </button>
              ) : (
                upcoming.map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      "group flex w-full gap-3 rounded-md border p-2.5 text-left transition hover:border-border hover:bg-panel",
                      selectedItemId === item.id ? "border-accent/30 bg-accent/8" : "border-transparent",
                    )}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="w-10 shrink-0 text-center">
                      <p className="text-lg font-semibold leading-none">{parseDate(item.date).getDate()}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase text-muted">{parseDate(item.date).toLocaleDateString("fr-FR", { month: "short" })}</p>
                    </div>
                    <div className="min-w-0 border-l border-border pl-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", kindStyles[item.kind].dot)} />
                        <p className="truncate text-sm font-medium group-hover:text-accent">{item.label}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">{formatSchedule(item)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted">
              Clic droit sur un jour pour créer directement un événement.
            </p>
          </aside>
        </div>
      </section>

      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        eyebrow="Nouvelle date"
        title="Qu'est-ce qui se passe ?"
        description={draft ? parseDate(draft.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : undefined}
        className="max-w-2xl"
      >
        {draft ? (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              {eventKinds.map((kind) => (
                <button
                  key={kind.id}
                  className={cn("rounded-md border border-border p-3 text-left transition hover:border-accent/35 hover:bg-accent/[0.035]", draft.kind === kind.id && "border-accent bg-accent/10")}
                  type="button"
                  onClick={() => selectKind(kind.id)}
                >
                  <span className="flex items-center gap-2 font-medium">{kindIcon(kind.id)}{kind.label}</span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted">{kind.description}</span>
                </button>
              ))}
            </div>

            {draft.kind === "show" ? (
              <label className="block text-sm font-medium">
                Spectacle
                <Select className="mt-2" value={draft.relatedShowId} onChange={(event) => updateDraft({ relatedShowId: event.target.value })}>
                  {shows.length === 0 ? <option value="">Aucun spectacle disponible</option> : null}
                  {shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
                </Select>
              </label>
            ) : (
              <label className="block text-sm font-medium">
                Titre
                <Input className="mt-2" autoFocus placeholder={draft.kind === "deadline" ? "Dépôt du dossier DRAC" : "Répétition générale, rendez-vous..."} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm font-medium">
                Date
                <Input className="mt-2" type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} />
              </label>
              {draft.kind !== "show" ? (
                <label className="mt-auto flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-sm font-medium">
                  <input type="checkbox" checked={draft.allDay} onChange={(event) => updateDraft({ allDay: event.target.checked })} />
                  Toute la journée
                </label>
              ) : null}
            </div>

            {!draft.allDay || draft.kind === "show" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Début
                  <div className="relative mt-2">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                    <Input className="pl-10" type="time" value={draft.startTime} onChange={(event) => updateDraft({ startTime: event.target.value })} />
                  </div>
                </label>
                <label className="block text-sm font-medium">
                  Fin <span className="font-normal text-muted">(optionnel)</span>
                  <Input className="mt-2" type="time" value={draft.endTime} onChange={(event) => updateDraft({ endTime: event.target.value })} />
                </label>
              </div>
            ) : null}

            <label className="block text-sm font-medium">
              Lieu <span className="font-normal text-muted">(optionnel)</span>
              <div className="relative mt-2">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input className="pl-10" placeholder="Théâtre, ville ou adresse" value={draft.location} onChange={(event) => updateDraft({ location: event.target.value })} />
              </div>
            </label>

            <label className="block text-sm font-medium">
              Note <span className="font-normal text-muted">(optionnel)</span>
              <Textarea className="mt-2 min-h-20" placeholder="Informations utiles pour l'équipe..." value={draft.note} onChange={(event) => updateDraft({ note: event.target.value })} />
            </label>

            {error ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Annuler</Button>
              <Button type="button" disabled={isSaving || (draft.kind === "show" && !draft.relatedShowId)} onClick={submitDraft}>
                {isSaving ? "Ajout en cours..." : "Ajouter à l'agenda"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function formatSchedule(item: CalendarBoardItem) {
  const schedule = item.startTime
    ? `${item.startTime.slice(0, 5)}${item.endTime ? ` – ${item.endTime.slice(0, 5)}` : ""}`
    : kindStyles[item.kind].label;
  return item.location ? `${schedule} · ${item.location}` : schedule;
}

function kindIcon(kind: CalendarEventKind) {
  if (kind === "show") return <Drama className="h-4 w-4 text-accent" aria-hidden />;
  if (kind === "deadline") return <Bell className="h-4 w-4 text-danger" aria-hidden />;
  return <Landmark className="h-4 w-4 text-success" aria-hidden />;
}
