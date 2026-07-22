import { CalendarBoard, type CalendarBoardItem } from "@/components/calendar/calendar-board";
import {
  getCalendarEvents,
  getFixedCosts,
  getGrantOpportunities,
  getReminders,
  getShows,
} from "@/lib/supabase/queries";

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

export default async function CalendarPage() {
  const [shows, reminders, grants, fixedCosts, events] = await Promise.all([
    getShows(),
    getReminders(),
    getGrantOpportunities(),
    getFixedCosts(),
    getCalendarEvents(),
  ]);

  const items: CalendarBoardItem[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      date: event.eventDate,
      href: "/calendar",
      kind: event.kind,
      label: event.title,
      meta: event.note || event.location || "Événement de la compagnie",
      tone: event.kind === "deadline" ? "danger" as const : "success" as const,
      allDay: event.allDay,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      relatedShowId: event.relatedShowId ?? undefined,
      relatedShowTitle: event.relatedShowId
        ? shows.find((show) => show.id === event.relatedShowId)?.title
        : undefined,
    })),
    ...reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      date: reminder.dueDate,
      href: "/reminders",
      kind: "reminder" as const,
      label: reminder.label,
      meta: reminder.relatedTo || "Action à réaliser",
      tone: getReminderTone(reminder.dueDate),
      allDay: true,
      startTime: null,
      endTime: null,
      location: "",
    })),
    ...shows
      .filter((show) => show.nextDate)
      .map((show) => ({
        id: `show-${show.id}`,
        date: show.nextDate,
        href: `/shows/${show.id}`,
        kind: "show" as const,
        label: show.title,
        meta: `${show.discipline} · ${show.status}`,
        tone: show.status === "En diffusion" ? "success" as const : "neutral" as const,
        allDay: true,
        startTime: null,
        endTime: null,
        location: "",
      })),
    ...grants.map((grant) => ({
      id: `grant-${grant.id}`,
      date: grant.deadline,
      href: `/subventions?focus=${grant.id}#grant-${grant.id}`,
      kind: "grant" as const,
      label: grant.title,
      meta: `${grant.funder} · ${grant.status}`,
      tone: getReminderTone(grant.deadline),
      allDay: true,
      startTime: null,
      endTime: null,
      location: "",
      relatedShowId: grant.relatedShowId,
      relatedShowTitle: grant.relatedShowId
        ? shows.find((show) => show.id === grant.relatedShowId)?.title
        : undefined,
    })),
    ...fixedCosts.map((cost) => ({
      id: `fixed-cost-${cost.id}`,
      date: cost.nextDueDate,
      href: "/finances",
      kind: "fixed-cost" as const,
      label: cost.label,
      meta: `${cost.category} · ${cost.frequency}`,
      tone: getReminderTone(cost.nextDueDate),
      allDay: true,
      startTime: null,
      endTime: null,
      location: "",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <CalendarBoard
      items={items}
      shows={shows.map((show) => ({ id: show.id, title: show.title }))}
    />
  );
}
