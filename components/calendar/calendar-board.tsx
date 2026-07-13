"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildIcsCalendar } from "@/lib/calendar-ics";
import type { CalendarEventKind } from "@/types";

export type CalendarBoardItem = {
  id: string;
  date: string;
  href: string;
  kind: "fixed-cost" | "grant" | "show" | "reminder" | "event" | "deadline";
  label: string;
  meta: string;
};

const kindStyles: Record<CalendarBoardItem["kind"], { dot: string; chip: string; label: string }> = {
  show: { dot: "bg-accent", chip: "bg-accent/10 text-accent", label: "Spectacle" },
  reminder: { dot: "bg-warning", chip: "bg-warning/10 text-warning", label: "Action" },
  grant: { dot: "bg-danger", chip: "bg-danger/10 text-danger", label: "Subvention" },
  "fixed-cost": { dot: "bg-muted", chip: "bg-panel-strong text-muted", label: "Frais fixe" },
  event: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Evenement" },
  deadline: { dot: "bg-danger", chip: "bg-danger/10 text-danger", label: "Deadline" },
};

const weekdayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Lundi = premier jour de la semaine.
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

const kindLabels: Record<CalendarEventKind, string> = {
  event: "Evenement",
  deadline: "Deadline perso",
  show: "Date de spectacle",
};

export function CalendarBoard({
  items,
  shows = [],
}: {
  items: CalendarBoardItem[];
  shows?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [isSaving, startSaving] = useTransition();

  // Menu contextuel (clic droit sur un jour)
  const [menu, setMenu] = useState<{ x: number; y: number; date: string } | null>(null);
  // Formulaire d'ajout
  const [draft, setDraft] = useState<{
    date: string;
    kind: CalendarEventKind;
    title: string;
    relatedShowId: string;
    note: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  function openDraft(kind: CalendarEventKind, date: string) {
    setMenu(null);
    setError(null);
    setDraft({
      date,
      kind,
      title: "",
      relatedShowId: kind === "show" ? shows[0]?.id ?? "" : "",
      note: "",
    });
  }

  function submitDraft() {
    if (!draft) return;
    const title =
      draft.kind === "show" && !draft.title
        ? shows.find((show) => show.id === draft.relatedShowId)?.title ?? "Date de spectacle"
        : draft.title;
    if (!title.trim()) {
      setError("Donnez un titre a l'evenement.");
      return;
    }
    startSaving(async () => {
      const result = await createCalendarEvent({
        title,
        eventDate: draft.date,
        kind: draft.kind,
        relatedShowId: draft.kind === "show" ? draft.relatedShowId : "",
        note: draft.note,
      });
      if (result.ok) {
        setDraft(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarBoardItem[]>();
    for (const item of items) {
      const key = dateKey(new Date(item.date));
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const today = startOfDay(new Date());

  const days = useMemo(() => {
    if (view === "week") {
      const weekStart = addDays(cursor, -mondayIndex(cursor));
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = addDays(first, -mondayIndex(first));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const title = useMemo(() => {
    if (view === "week") {
      const weekStart = addDays(cursor, -mondayIndex(cursor));
      const weekEnd = addDays(weekStart, 6);
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
      const startLabel = weekStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: sameMonth ? undefined : "short",
      });
      const endLabel = weekEnd.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${startLabel} - ${endLabel}`;
    }
    const label = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor, view]);

  function move(direction: -1 | 1) {
    if (view === "week") {
      setCursor((current) => addDays(current, direction * 7));
    } else {
      setCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    }
  }

  function exportIcs() {
    const ics = buildIcsCalendar(
      items.map((item) => ({
        uid: `${item.id}@tadiff`,
        date: item.date,
        summary: `${kindStyles[item.kind].label} - ${item.label}`,
        description: item.meta,
      })),
      "TaDiff - Echeances",
    );
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tadiff-calendrier.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => move(-1)} aria-label="Precedent">
            {"<"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setCursor(startOfDay(new Date()))}>
            Aujourd&apos;hui
          </Button>
          <Button type="button" variant="secondary" onClick={() => move(1)} aria-label="Suivant">
            {">"}
          </Button>
          <p className="ml-2 text-lg font-semibold">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium ${view === "month" ? "bg-accent text-white" : "bg-panel text-muted"}`}
              onClick={() => setView("month")}
            >
              Mois
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium ${view === "week" ? "bg-accent text-white" : "bg-panel text-muted"}`}
              onClick={() => setView("week")}
            >
              Semaine
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={exportIcs}>
            Exporter (.ics)
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-7 border-b border-border">
            {weekdayLabels.map((label) => (
              <div key={label} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${view === "week" ? "" : "grid-rows-6"}`}>
            {days.map((day) => {
              const key = dateKey(day);
              const dayItems = itemsByDay.get(key) ?? [];
              const isToday = day.getTime() === today.getTime();
              const isOtherMonth = view === "month" && day.getMonth() !== cursor.getMonth();
              const maxVisible = view === "week" ? 8 : 3;

              return (
                <div
                  key={key}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({ x: event.clientX, y: event.clientY, date: toIsoDate(day) });
                  }}
                  className={`border-b border-r border-border p-1.5 ${
                    view === "week" ? "min-h-40" : "min-h-24"
                  } ${isOtherMonth ? "bg-panel-strong/30 text-muted" : "bg-panel"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "bg-accent text-white" : "text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, maxVisible).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${kindStyles[item.kind].chip}`}
                        title={`${item.label} - ${item.meta}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${kindStyles[item.kind].dot}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                    {dayItems.length > maxVisible ? (
                      <p className="px-1.5 text-xs text-muted">+{dayItems.length - maxVisible}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          {Object.entries(kindStyles).map(([kind, style]) => (
            <span key={kind} className="flex items-center gap-2 text-xs text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted">Clic droit sur un jour pour ajouter une date.</p>
      </div>

      {menu ? (
        <div
          className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-panel shadow-xl shadow-ink/20"
          style={{ top: menu.y, left: menu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="border-b border-border px-3 py-2 text-xs text-muted">
            {new Date(menu.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {(["event", "deadline", "show"] as CalendarEventKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-panel-strong"
              onClick={() => openDraft(kind, menu.date)}
              disabled={kind === "show" && shows.length === 0}
            >
              <span className={`h-2 w-2 rounded-full ${kindStyles[kind].dot}`} />
              {kindLabels[kind]}
            </button>
          ))}
        </div>
      ) : null}

      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        eyebrow="Agenda"
        title={draft ? kindLabels[draft.kind] : "Ajouter"}
        description={
          draft
            ? new Date(draft.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined
        }
        className="max-w-lg"
      >
        {draft ? (
          <div className="space-y-4">
            {draft.kind === "show" ? (
              <label className="block text-sm font-medium">
                Spectacle
                <Select
                  className="mt-2"
                  value={draft.relatedShowId}
                  onChange={(event) => setDraft({ ...draft, relatedShowId: event.target.value })}
                >
                  {shows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.title}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}

            <label className="block text-sm font-medium">
              Titre
              <Input
                className="mt-2"
                placeholder={draft.kind === "deadline" ? "Depot dossier, paiement..." : "Repetition, sortie de residence..."}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>

            <label className="block text-sm font-medium">
              Note (optionnel)
              <Textarea
                className="mt-2"
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="button" disabled={isSaving} onClick={submitDraft}>
              {isSaving ? "Ajout..." : "Ajouter a l'agenda"}
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
