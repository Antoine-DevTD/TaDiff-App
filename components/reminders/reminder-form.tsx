"use client";

import { CalendarDays, FileText, Mail, Phone, Plus, ReceiptText, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createReminder, createRemindersForContacts } from "@/app/(dashboard)/actions";
import { askWilliamAction } from "@/app/(dashboard)/william/assistant-action";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WilliamRequestPanel } from "@/components/william/william-request-panel";
import { cn } from "@/lib/utils";
import type { Contact, Reminder, Show } from "@/types";

type ActionType = NonNullable<Reminder["actionType"]>;

const actionPresets: Array<{
  id: ActionType;
  label: string;
  icon: typeof Phone;
}> = [
  { id: "call", label: "Appeler", icon: Phone },
  { id: "email", label: "Envoyer un email", icon: Mail },
  { id: "document", label: "Envoyer le dossier", icon: FileText },
  { id: "quote", label: "Preparer un devis", icon: ReceiptText },
  { id: "administration", label: "Mettre a jour", icon: Settings2 },
  { id: "other", label: "Autre", icon: Plus },
];

export function ReminderForm({
  contacts,
  initialContactId,
  initialContactIds,
  initialShowId,
  onClose,
  onCreated,
  onCreatedMany,
  open,
  shows,
}: {
  contacts: Contact[];
  initialContactId?: string;
  initialContactIds?: string[];
  initialShowId?: string;
  onClose: () => void;
  onCreated?: (reminder: Reminder) => void;
  onCreatedMany?: (reminders: Reminder[]) => void;
  open: boolean;
  shows: Show[];
}) {
  const router = useRouter();
  const startingContactIds = initialContactIds?.length ? initialContactIds : initialContactId ? [initialContactId] : [];
  const groupedContacts = contacts.filter((contact) => startingContactIds.includes(contact.id));
  const grouped = groupedContacts.length > 1;
  const startingShowId = initialShowId || shows[0]?.id || "";
  const startingContact = groupedContacts[0];
  const [showId, setShowId] = useState(startingShowId);
  const [actionType, setActionType] = useState<ActionType | "">(startingContactIds.length ? "call" : "");
  const [contactId, setContactId] = useState(grouped ? "" : startingContact?.id || "");
  const [title, setTitle] = useState(() => grouped
    ? buildGroupedActionTitle("call")
    : startingContact
      ? buildActionTitle("call", shows.find((show) => show.id === startingShowId), startingContact)
      : "");
  const [dueDate, setDueDate] = useState(() => dateAfterDays(1));
  const [urgent, setUrgent] = useState(false);
  const [message, setMessage] = useState("");
  const [williamOpen, setWilliamOpen] = useState(false);
  const [williamRequest, setWilliamRequest] = useState("Propose la prochaine action la plus utile et la plus rapide à réaliser.");
  const [isPending, startTransition] = useTransition();
  const [isWilliamPending, startWilliamTransition] = useTransition();

  const selectedShow = shows.find((show) => show.id === showId);
  const selectedContact = contacts.find((contact) => contact.id === contactId);
  const contactUseful = actionType === "call" || actionType === "email";
  const canSubmit = Boolean(showId && actionType && title.trim() && dueDate);

  const quickDates = useMemo(() => [
    { label: "Aujourd'hui", value: dateAfterDays(0) },
    { label: "Demain", value: dateAfterDays(1) },
    { label: "Dans 3 jours", value: dateAfterDays(3) },
    { label: "Dans 1 semaine", value: dateAfterDays(7) },
  ], []);

  function chooseShow(nextShowId: string) {
    setShowId(nextShowId);
    if (actionType) {
      const nextShow = shows.find((show) => show.id === nextShowId);
      setTitle(grouped ? buildGroupedActionTitle(actionType) : buildActionTitle(actionType, nextShow, selectedContact));
    }
  }

  function chooseAction(nextType: ActionType) {
    setActionType(nextType);
    if (nextType !== "call" && nextType !== "email") setContactId("");
    setTitle(grouped ? buildGroupedActionTitle(nextType) : buildActionTitle(nextType, selectedShow, selectedContact));
  }

  function chooseContact(nextContactId: string) {
    setContactId(nextContactId);
    const contact = contacts.find((item) => item.id === nextContactId);
    if (actionType) setTitle(buildActionTitle(actionType, selectedShow, contact));
  }

  function submit() {
    if (!canSubmit || !actionType || !selectedShow) return;
    setMessage("");
    startTransition(async () => {
      const values = {
        actionType,
        contactId: grouped ? undefined : contactId || undefined,
        dueDate,
        priority: urgent ? "high" : "normal",
        relatedTo: selectedShow.title,
        showId,
        title: title.trim(),
      } as const;
      const result = grouped
        ? await createRemindersForContacts(groupedContacts.map((contact) => contact.id), values)
        : await createReminder(values);
      setMessage(result.message);
      if (result.ok) {
        if (result.reminder) onCreated?.(result.reminder);
        if (result.reminders) onCreatedMany?.(result.reminders);
        router.refresh();
        onClose();
      }
    });
  }

  function askWilliamForSuggestion() {
    if (!selectedShow) return;
    setMessage("");
    startWilliamTransition(async () => {
      const result = await askWilliamAction([
        "Propose une seule prochaine action concrete et courte pour faire avancer ce spectacle.",
        `Spectacle : ${selectedShow.title}.`,
        selectedShow.status ? `Statut : ${selectedShow.status}.` : "",
        selectedShow.logline ? `Presentation : ${selectedShow.logline}.` : "",
        selectedContact ? `Contact concerne : ${selectedContact.name}, ${selectedContact.organization}.` : "",
        actionType ? `Type d'action envisage : ${actionType}.` : "",
        `Demande de l'utilisateur : ${williamRequest}`,
        "Reponds uniquement par le libelle de l'action, en francais, sans guillemets ni explication, en 12 mots maximum.",
      ].filter(Boolean).join("\n"));
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setTitle(result.answer.text.replace(/^[\s"'*-]+|[\s"']+$/g, "").split("\n")[0]);
      setWilliamOpen(false);
    });
  }

  return (
    <Dialog
      className="max-w-4xl"
      description={grouped
        ? `Une action distincte sera creee pour chacun des ${groupedContacts.length} contacts selectionnes.`
        : "Trois choix suffisent. Vous pourrez toujours ajuster le libelle avant d'ajouter l'action."}
      eyebrow="Nouvelle action"
      open={open}
      title="Que faut-il faire ?"
      onClose={onClose}
    >
      <div className="space-y-7">
        <ComposerSection number="1" title="Pour quel spectacle ?">
          {shows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">Ajoutez d&apos;abord un spectacle pour pouvoir organiser ses actions.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {shows.map((show) => (
                <button
                  key={show.id}
                  aria-pressed={showId === show.id}
                  className={cn(
                    "group w-28 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    showId === show.id ? "text-accent" : "text-foreground",
                  )}
                  type="button"
                  onClick={() => chooseShow(show.id)}
                >
                  <span
                    className={cn(
                      "flex aspect-[3/4] items-end overflow-hidden rounded-md border bg-ink bg-cover bg-center p-2 shadow-sm transition duration-200 motion-reduce:transition-none",
                      showId === show.id ? "border-accent ring-2 ring-accent/20" : "border-border group-hover:-translate-y-1 group-hover:border-accent/60 motion-reduce:transform-none",
                    )}
                    style={show.posterUrl ? { backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(8,16,33,.84)), url(${show.posterUrl})` } : undefined}
                  >
                    {!show.posterUrl ? <span className="text-2xl font-semibold text-white/70">T</span> : null}
                  </span>
                  <span className="mt-2 block line-clamp-2 text-sm font-medium leading-5">{show.title}</span>
                </button>
              ))}
            </div>
          )}
        </ComposerSection>

        <ComposerSection number="2" title="Quelle action ?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {actionPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  aria-pressed={actionType === preset.id}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium transition",
                    actionType === preset.id ? "border-accent bg-accent/8 text-accent" : "border-border bg-panel hover:border-accent/50 hover:bg-panel-strong",
                  )}
                  type="button"
                  onClick={() => chooseAction(preset.id)}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {preset.label}
                </button>
              );
            })}
          </div>
          {contactUseful && grouped ? (
            <div className="mt-4 rounded-md border border-border bg-panel-strong/45 p-3">
              <p className="text-sm font-semibold">{groupedContacts.length} contacts selectionnes</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{groupedContacts.map((contact) => contact.name).join(", ")}</p>
            </div>
          ) : contactUseful ? (
            <label className="mt-4 block text-sm font-medium">
              Contact <span className="font-normal text-muted">(facultatif)</span>
              <Select className="mt-2" value={contactId} onChange={(event) => chooseContact(event.target.value)}>
                <option value="">Sans contact precis</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.organization ? ` - ${contact.organization}` : ""}</option>)}
              </Select>
            </label>
          ) : null}
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="reminder-title">Action</label>
              <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-panel px-3 text-xs font-medium text-accent transition hover:border-accent/50 hover:bg-accent/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" disabled={!selectedShow || isWilliamPending} type="button" onClick={() => setWilliamOpen((value) => !value)}>
                <span className="grid h-5 w-5 place-items-center rounded bg-ink text-[10px] font-semibold text-white">T</span>
                Demander à William
              </button>
            </div>
            <div className="mt-3">
              <WilliamRequestPanel
                actionLabel="Proposer une action"
                context={[selectedShow?.title ?? "Spectacle à choisir", grouped ? `${groupedContacts.length} contacts` : selectedContact?.name ?? "Sans contact", actionType ? actionPresets.find((preset) => preset.id === actionType)?.label ?? actionType : "Type à choisir"]}
                description="William s'appuie sur le spectacle et le contact choisis pour proposer une action courte."
                open={williamOpen}
                pending={isWilliamPending}
                placeholder="Ex. Propose une action pour relancer ce lieu cette semaine."
                title="Que doit chercher William ?"
                value={williamRequest}
                onCancel={() => setWilliamOpen(false)}
                onChange={setWilliamRequest}
                onSubmit={askWilliamForSuggestion}
              />
            </div>
            <Input id="reminder-title" className="mt-2" placeholder="Decrivez l'action en quelques mots" value={title} onChange={(event) => setTitle(event.target.value)} />
            {grouped ? <p className="mt-2 text-xs text-muted"><code>@contact</code> sera remplace par le nom de chaque personne ou lieu.</p> : null}
          </div>
        </ComposerSection>

        <ComposerSection number="3" title="Pour quand ?">
          <div className="flex flex-wrap gap-2">
            {quickDates.map((date) => (
              <button
                key={date.value}
                className={cn("rounded-full border px-3 py-2 text-sm transition", dueDate === date.value ? "border-accent bg-accent text-white" : "border-border bg-panel hover:bg-panel-strong")}
                type="button"
                onClick={() => setDueDate(date.value)}
              >
                {date.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm font-medium">
              Date precise
              <Input className="mt-2" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium">
              <input checked={urgent} type="checkbox" onChange={(event) => setUrgent(event.target.checked)} />
              Urgent
            </label>
          </div>
        </ComposerSection>

        {message ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="status">{message}</p> : null}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button disabled={!canSubmit || isPending} type="button" onClick={submit}>
            <CalendarDays aria-hidden="true" className="mr-2 h-4 w-4" />
            {isPending ? "Ajout..." : "Ajouter l'action"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ComposerSection({ children, number, title }: { children: React.ReactNode; number: string; title: string }) {
  return <section><div className="mb-3 flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-panel-strong text-xs font-semibold text-accent">{number}</span><h4 className="font-semibold">{title}</h4></div>{children}</section>;
}

function dateAfterDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function buildActionTitle(type: ActionType, show?: Show, contact?: Contact) {
  const person = contact?.name || "un contact";
  const showTitle = show?.title || "ce spectacle";
  if (type === "call") return `Appeler ${person}`;
  if (type === "email") return `Envoyer un email a ${person}`;
  if (type === "document") return `Envoyer le dossier de ${showTitle}`;
  if (type === "quote") return `Preparer un devis pour ${showTitle}`;
  if (type === "administration") return `Mettre a jour le dossier de ${showTitle}`;
  return "";
}

function buildGroupedActionTitle(type: ActionType) {
  if (type === "call") return "Appeler @contact";
  if (type === "email") return "Envoyer un email a @contact";
  if (type === "document") return "Envoyer le dossier a @contact";
  if (type === "quote") return "Preparer un devis pour @contact";
  if (type === "administration") return "Mettre a jour le suivi de @contact";
  return "Faire avancer @contact";
}
