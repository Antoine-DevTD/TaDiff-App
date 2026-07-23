"use client";

import { AlertTriangle, CalendarClock, Check, ClipboardPen, FileText, Mail, Phone, Plus, ReceiptText, RotateCcw, Search, Settings2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { reopenReminder } from "@/app/(dashboard)/actions";
import { ReminderCompletionDialog } from "@/components/reminders/reminder-completion-dialog";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Contact, Reminder, Show } from "@/types";

type ReminderFilter = "todo" | "today" | "week" | "later" | "completed";

export function RemindersWorkspace({ contacts, initialContactId, reminders, shows }: { contacts: Contact[]; initialContactId?: string; reminders: Reminder[]; shows: Show[] }) {
  const [items, setItems] = useState(reminders);
  const [filter, setFilter] = useState<ReminderFilter>("todo");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(Boolean(initialContactId));
  const [composerShowId, setComposerShowId] = useState<string>();
  const [completionReminder, setCompletionReminder] = useState<Reminder | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const todayTime = startOfDay(new Date()).getTime();

  const counts = useMemo(() => ({
    late: items.filter((item) => !item.done && startOfDay(new Date(item.dueDate)).getTime() < todayTime).length,
    today: items.filter((item) => !item.done && startOfDay(new Date(item.dueDate)).getTime() === todayTime).length,
    week: items.filter((item) => !item.done && isThisWeek(item.dueDate)).length,
    completed: items.filter((item) => item.done).length,
  }), [items, todayTime]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "completed" ? !item.done : item.done) return false;
      if (!matchesFilter(item, filter)) return false;
      if (!query) return true;
      const show = shows.find((entry) => entry.id === item.showId);
      const contact = contacts.find((entry) => entry.id === item.contactId);
      return [item.label, item.relatedTo, show?.title, contact?.name, contact?.organization].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [contacts, filter, items, search, shows]);

  const showGroups = useMemo(() => {
    const groups = shows.map((show) => ({ show, reminders: visibleItems.filter((item) => item.showId === show.id) })).filter((group) => group.reminders.length > 0);
    const orphaned = visibleItems.filter((item) => !item.showId || !shows.some((show) => show.id === item.showId));
    return { groups, orphaned };
  }, [shows, visibleItems]);

  function openComposer(showId?: string) {
    setComposerShowId(showId);
    setComposerOpen(true);
  }

  function reopen(id: string) {
    setActionMessage(null);
    startTransition(async () => {
      const result = await reopenReminder(id);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setItems((current) => current.map((item) => item.id === id ? {
        ...item,
        done: false,
        completedAt: undefined,
        completionOutcome: undefined,
        completionNote: undefined,
      } : item));
      setActionMessage("Action rouverte. Elle est revenue dans les actions à faire.");
    });
  }

  function addCreatedReminder(reminder: Reminder) {
    setItems((current) => current.some((item) => item.id === reminder.id) ? current : [...current, reminder]);
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Feuille de route</p>
          <h2 className="mt-2 text-2xl font-semibold">Ce qui fait avancer vos spectacles</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <StatusCount danger={counts.late > 0} label="en retard" value={counts.late} />
            <StatusCount label="aujourd'hui" value={counts.today} />
            <StatusCount label="cette semaine" value={counts.week} />
          </div>
        </div>
        <Button disabled={shows.length === 0} type="button" onClick={() => openComposer()}><Plus aria-hidden="true" className="mr-2 h-4 w-4" />Ajouter une action</Button>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-md bg-panel-strong p-1">
          {[
            { id: "todo", label: "À faire" },
            { id: "today", label: "Aujourd'hui" },
            { id: "week", label: "7 prochains jours" },
            { id: "later", label: "Plus tard" },
            { id: "completed", label: `Terminées (${counts.completed})` },
          ].map((item) => <button key={item.id} aria-pressed={filter === item.id} className={cn("rounded px-3 py-2 text-sm font-medium transition", filter === item.id ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground")} type="button" onClick={() => setFilter(item.id as ReminderFilter)}>{item.label}</button>)}
        </div>
        <label className="relative block sm:w-72"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">Rechercher une action</span><Input className="pl-9" placeholder="Rechercher" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      </div>

      {actionMessage ? <p className="rounded-md border border-border bg-panel px-3 py-2 text-sm text-muted" role="status">{actionMessage}</p> : null}

      {shows.length === 0 ? (
        <Card className="flex flex-col items-start gap-4 border-dashed p-6"><div className="grid h-11 w-11 place-items-center rounded-md bg-panel-strong text-accent"><ClipboardPen className="h-5 w-5" /></div><div><h3 className="font-semibold">Commencez par votre premier spectacle</h3><p className="mt-1 text-sm text-muted">Les actions seront classées automatiquement dans sa feuille de route.</p></div><ButtonLink href="/shows?create=1">Ajouter un spectacle</ButtonLink></Card>
      ) : visibleItems.length === 0 ? (
        <Card className="flex min-h-56 flex-col items-center justify-center border-dashed text-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success"><Check className="h-5 w-5" /></div><h3 className="mt-4 font-semibold">{filter === "completed" ? "Aucune action terminée" : "Rien à faire dans cette vue"}</h3><p className="mt-1 max-w-md text-sm text-muted">{filter === "completed" ? "Les actions clôturées et leur compte rendu apparaîtront ici." : "Changez de période ou ajoutez la prochaine action utile à un spectacle."}</p>{filter !== "completed" ? <Button className="mt-4" type="button" onClick={() => openComposer()}><Plus className="mr-2 h-4 w-4" />Ajouter une action</Button> : null}</Card>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {showGroups.groups.map(({ show, reminders: showReminders }) => <ShowActionBoard key={show.id} archived={filter === "completed"} contacts={contacts} isPending={isPending} reminders={showReminders} show={show} onAdd={() => openComposer(show.id)} onDone={setCompletionReminder} onReopen={reopen} />)}
          {showGroups.orphaned.length > 0 ? <ShowActionBoard archived={filter === "completed"} contacts={contacts} isPending={isPending} reminders={showGroups.orphaned} onAdd={() => openComposer()} onDone={setCompletionReminder} onReopen={reopen} /> : null}
        </div>
      )}

      <ReminderForm key={`${composerOpen}-${composerShowId ?? "new"}-${initialContactId ?? "contact"}`} contacts={contacts} initialContactId={initialContactId} initialShowId={composerShowId} open={composerOpen} shows={shows} onClose={() => setComposerOpen(false)} onCreated={addCreatedReminder} />
      <ReminderCompletionDialog
        open={Boolean(completionReminder)}
        reminder={completionReminder}
        onClose={() => setCompletionReminder(null)}
        onCompleted={(values) => {
          if (!completionReminder) return;
          const completedId = completionReminder.id;
          setItems((current) => current.map((item) => item.id === completedId ? {
            ...item,
            done: true,
            completedAt: values.completedAt,
            completionOutcome: values.outcome,
            completionNote: values.note,
          } : item));
          setActionMessage("Action terminée et conservée dans l'historique.");
        }}
      />
    </div>
  );
}

function ShowActionBoard({ archived, contacts, isPending, onAdd, onDone, onReopen, reminders, show }: { archived: boolean; contacts: Contact[]; isPending: boolean; onAdd: () => void; onDone: (reminder: Reminder) => void; onReopen: (id: string) => void; reminders: Reminder[]; show?: Show }) {
  const ordered = [...reminders].sort((a, b) => archived
    ? new Date(b.completedAt ?? b.dueDate).getTime() - new Date(a.completedAt ?? a.dueDate).getTime()
    : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return (
    <Card className="overflow-hidden p-0">
      <header className="flex min-h-28 border-b border-border bg-panel-strong/45">
        {show?.posterUrl ? <div className="w-24 shrink-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(8,16,33,.72)), url(${show.posterUrl})` }} /> : null}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{show ? "Spectacle" : "À rattacher"}</p>
            <h3 className="mt-1 truncate text-lg font-semibold">{show?.title || "Actions de la compagnie"}</h3>
            <p className="mt-1 text-sm text-muted">{ordered.length} action{ordered.length > 1 ? "s" : ""} {archived ? "terminée" : "à faire"}{ordered.length > 1 ? "s" : ""}</p>
          </div>
          {!archived ? <Button aria-label={`Ajouter une action${show ? ` pour ${show.title}` : ""}`} className="h-12 w-12 shrink-0 p-0 shadow-sm" title="Ajouter une action" type="button" variant="secondary" onClick={onAdd}><Plus className="h-5 w-5" /></Button> : null}
        </div>
      </header>
      <div className="divide-y divide-border">
        {ordered.map((reminder) => (
          <ActionRow
            key={reminder.id}
            contact={contacts.find((item) => item.id === reminder.contactId)}
            disabled={isPending}
            reminder={reminder}
            onDone={() => onDone(reminder)}
            onReopen={() => onReopen(reminder.id)}
          />
        ))}
      </div>
    </Card>
  );
}

function ActionRow({ contact, disabled, onDone, onReopen, reminder }: { contact?: Contact; disabled: boolean; onDone: () => void; onReopen: () => void; reminder: Reminder }) {
  const late = startOfDay(new Date(reminder.dueDate)) < startOfDay(new Date());
  const outcomeLabel = getOutcomeLabel(reminder.completionOutcome);
  return (
    <article className={cn("group relative flex items-start gap-3 overflow-hidden px-4 py-3.5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:origin-bottom before:scale-y-0 before:bg-accent before:transition-transform hover:bg-panel-strong/50 hover:before:scale-y-100", !reminder.done && late && "before:scale-y-100 before:bg-danger", reminder.done && "bg-success/[0.035]")}>
      {reminder.done ? (
        <button aria-label={`Rouvrir ${reminder.label}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-success/30 bg-success/10 text-success transition hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" disabled={disabled} title="Rouvrir l'action" type="button" onClick={onReopen}><RotateCcw className="h-4 w-4" /></button>
      ) : (
        <button aria-label={`Marquer ${reminder.label} comme fait`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted transition hover:border-success hover:bg-success/10 hover:text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" disabled={disabled} title="Marquer comme fait" type="button" onClick={onDone}><Check className="h-4 w-4" /></button>
      )}
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-panel-strong text-muted"><ActionGlyph type={reminder.actionType} /></div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", reminder.done && "text-muted line-through")}>{reminder.label}</p>
        {contact ? <p className="mt-1 text-xs text-muted">{contact.name}{contact.organization ? ` - ${contact.organization}` : ""}</p> : null}
        {reminder.completionNote ? <p className="mt-2 text-sm leading-5 text-foreground">{reminder.completionNote}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        {reminder.done ? (
          <><Badge tone="success">{outcomeLabel || "Terminée"}</Badge><p className="mt-1 text-xs text-muted">{reminder.completedAt ? new Date(reminder.completedAt).toLocaleDateString("fr-FR") : "Terminée"}</p></>
        ) : (
          <><Badge tone={late ? "danger" : reminder.priority === "high" ? "warning" : "neutral"}>{dueLabel(reminder.dueDate)}</Badge><p className="mt-1 text-xs text-muted">{new Date(reminder.dueDate).toLocaleDateString("fr-FR")}</p></>
        )}
      </div>
    </article>
  );
}

function StatusCount({ danger = false, label, value }: { danger?: boolean; label: string; value: number }) { return <span className={cn("inline-flex items-center gap-2", danger && "font-medium text-danger")}>{danger ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}<strong>{value}</strong> {label}</span>; }
function ActionGlyph({ type }: { type?: Reminder["actionType"] }) { if (type === "call") return <Phone aria-hidden="true" className="h-4 w-4" />; if (type === "email") return <Mail aria-hidden="true" className="h-4 w-4" />; if (type === "document") return <FileText aria-hidden="true" className="h-4 w-4" />; if (type === "quote") return <ReceiptText aria-hidden="true" className="h-4 w-4" />; if (type === "administration") return <Settings2 aria-hidden="true" className="h-4 w-4" />; return <ClipboardPen aria-hidden="true" className="h-4 w-4" />; }
function startOfDay(date: Date) { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; }
function isThisWeek(date: string) { const due = startOfDay(new Date(date)); const today = startOfDay(new Date()); const end = new Date(today); end.setDate(end.getDate() + 7); return due >= today && due <= end; }
function matchesFilter(reminder: Reminder, filter: ReminderFilter) { const due = startOfDay(new Date(reminder.dueDate)); const today = startOfDay(new Date()); if (filter === "today") return due <= today; if (filter === "week") return isThisWeek(reminder.dueDate); if (filter === "later") { const end = new Date(today); end.setDate(end.getDate() + 7); return due > end; } return true; }
function dueLabel(date: string) { const due = startOfDay(new Date(date)); const today = startOfDay(new Date()); const days = Math.round((due.getTime() - today.getTime()) / 86400000); if (days < 0) return `${Math.abs(days)} j de retard`; if (days === 0) return "Aujourd'hui"; if (days === 1) return "Demain"; if (days <= 7) return `Dans ${days} j`; return "À venir"; }
function getOutcomeLabel(outcome?: Reminder["completionOutcome"]) { if (outcome === "positive") return "Ça avance"; if (outcome === "follow_up") return "À poursuivre"; if (outcome === "no_answer") return "Pas de réponse"; if (outcome === "negative") return "Sans suite"; if (outcome === "other") return "Autre"; return ""; }
