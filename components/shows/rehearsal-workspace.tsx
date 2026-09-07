"use client";

import {
  CalendarCheck,
  Check,
  Clock3,
  Copy,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  confirmRehearsalSlots,
  createRehearsalPoll,
  updateRehearsalSlotLocations,
} from "@/app/(dashboard)/shows/[id]/rehearsal-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RehearsalPoll, ShowTeamMember } from "@/lib/rehearsals";

type SlotDraft = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
};
type TimeRange = { id: string; startTime: string; endTime: string };
const blankRange = (): TimeRange => ({
  id: crypto.randomUUID(),
  startTime: "09:00",
  endTime: "12:00",
});
const responseLabels = {
  yes: "Disponible",
  maybe: "Si besoin",
  no: "Indisponible",
} as const;

function makeSlots(
  start: string,
  end: string,
  ranges: TimeRange[],
): SlotDraft[] {
  if (!start || !end || end < start) return [];
  const result: SlotDraft[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last && result.length < 180) {
    const date = cursor.toISOString().slice(0, 10);
    for (const range of ranges)
      if (
        range.startTime &&
        range.endTime > range.startTime &&
        result.length < 180
      )
        result.push({
          id: `${date}-${range.id}`,
          date,
          startTime: range.startTime,
          endTime: range.endTime,
          location: "",
        });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function RehearsalWorkspace({
  initialPolls,
  showId,
  team,
}: {
  initialPolls: RehearsalPoll[];
  showId: string;
  team: ShowTeamMember[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(initialPolls.length === 0);
  const [title, setTitle] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showResponses, setShowResponses] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState(() =>
    team.map((member) => member.id),
  );
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [ranges, setRanges] = useState<TimeRange[]>([
    blankRange(),
    { id: crypto.randomUUID(), startTime: "13:00", endTime: "17:00" },
  ]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const slots = useMemo(
    () => makeSlots(periodStart, periodEnd, ranges),
    [periodStart, periodEnd, ranges],
  );
  function submit() {
    startTransition(async () => {
      const result = await createRehearsalPoll({
        showId,
        title,
        defaultLocation,
        deadline,
        showResponses,
        teamMemberIds: selectedMembers,
        slots: slots.map((slot) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: slot.location,
        })),
      });
      setMessage(result.message);
      if (result.ok) {
        setCreating(false);
        router.refresh();
      }
    });
  }
  if (!team.length)
    return (
      <section className="border border-border bg-panel p-8 text-center">
        <CalendarCheck aria-hidden className="mx-auto h-8 w-8 text-accent" />
        <h3 className="mt-3 text-lg font-semibold">
          Commencez par constituer l’équipe
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          Le sondage proposera automatiquement les personnes rattachées au
          spectacle. Ajoutez-les dans l’onglet Équipe.
        </p>
      </section>
    );
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-lg font-semibold">
            Répétitions et disponibilités
          </h3>
          <p className="mt-1 text-sm text-muted">
            Proposez des créneaux à l’équipe, partagez le lien puis confirmez
            les répétitions retenues.
          </p>
        </div>
        {!creating ? (
          <Button onClick={() => setCreating(true)} type="button">
            <Plus aria-hidden className="mr-2 h-4 w-4" />
            Nouveau sondage
          </Button>
        ) : null}
      </div>
      {creating ? (
        <section
          aria-labelledby="new-rehearsal-poll"
          className="border border-border bg-panel p-5 sm:p-6"
        >
          <h4 id="new-rehearsal-poll" className="font-semibold">
            Préparer le sondage
          </h4>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="block text-sm font-medium">
              Nom du sondage
              <Input
                className="mt-2"
                placeholder="Répétitions de septembre"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Lieu par défaut{" "}
              <span className="font-normal text-muted">(facultatif)</span>
              <Input
                className="mt-2"
                placeholder="Studio des Lilas"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Répondre avant le{" "}
              <span className="font-normal text-muted">(facultatif)</span>
              <Input
                className="mt-2"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 self-end text-sm">
              <input
                checked={showResponses}
                className="h-4 w-4 accent-accent"
                onChange={(e) => setShowResponses(e.target.checked)}
                type="checkbox"
              />
              L’équipe peut voir les réponses des autres
            </label>
          </div>
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">
              Personnes invitées
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {team.map((member) => {
                const selected = selectedMembers.includes(member.id);
                return (
                  <button
                    aria-pressed={selected}
                    className={
                      selected
                        ? "min-h-10 rounded-md border border-accent bg-accent/10 px-3 text-sm font-medium text-accent"
                        : "min-h-10 rounded-md border border-border px-3 text-sm text-muted"
                    }
                    key={member.id}
                    onClick={() =>
                      setSelectedMembers((current) =>
                        selected
                          ? current.filter((id) => id !== member.id)
                          : [...current, member.id],
                      )
                    }
                    type="button"
                  >
                    {selected ? (
                      <Check aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                    ) : null}
                    {member.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">
              Période et horaires proposés
            </legend>
            <p className="mt-1 text-sm text-muted">
              Les horaires ci-dessous seront proposés chaque jour de la période.
              Vous pourrez ensuite modifier le lieu de plusieurs créneaux à la
              fois.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted" htmlFor="rehearsal-period-start">Du</label>
                <Input className="mt-1" id="rehearsal-period-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted" htmlFor="rehearsal-period-end">Au</label>
                <Input className="mt-1" id="rehearsal-period-end" min={periodStart} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {ranges.map((range, index) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                  key={range.id}
                >
                  <label className="text-xs font-medium text-muted">
                    Début {index + 1}
                    <Input
                      className="mt-1"
                      type="time"
                      value={range.startTime}
                      onChange={(e) =>
                        setRanges((current) =>
                          current.map((item) =>
                            item.id === range.id
                              ? { ...item, startTime: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Fin {index + 1}
                    <Input
                      className="mt-1"
                      type="time"
                      value={range.endTime}
                      onChange={(e) =>
                        setRanges((current) =>
                          current.map((item) =>
                            item.id === range.id
                              ? { ...item, endTime: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    aria-label={`Supprimer la plage ${index + 1}`}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-panel-strong hover:text-danger"
                    disabled={ranges.length === 1}
                    onClick={() =>
                      setRanges((current) =>
                        current.filter((item) => item.id !== range.id),
                      )
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                onClick={() =>
                  setRanges((current) => [...current, blankRange()])
                }
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden className="mr-2 h-4 w-4" />
                Ajouter une plage horaire
              </Button>
              <span className="text-sm text-muted">
                {slots.length
                  ? `${slots.length} créneau(x) généré(s)`
                  : "Choisissez une période"}
              </span>
            </div>
            {slots.length >= 180 ? (
              <p className="mt-2 text-sm text-warning">
                La proposition est limitée à 180 créneaux.
              </p>
            ) : null}
          </fieldset>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-muted">
              {message}
            </p>
            <div className="flex gap-3">
              {initialPolls.length ? (
                <Button
                  onClick={() => setCreating(false)}
                  type="button"
                  variant="ghost"
                >
                  Annuler
                </Button>
              ) : null}
              <Button
                disabled={
                  isPending ||
                  !title.trim() ||
                  !selectedMembers.length ||
                  !slots.length
                }
                onClick={submit}
                type="button"
              >
                {isPending ? "Création…" : "Créer et obtenir le lien"}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      {initialPolls.map((poll) => (
        <PollSummary key={poll.id} poll={poll} showId={showId} />
      ))}
    </div>
  );
}

function PollSummary({
  poll,
  showId,
}: {
  poll: RehearsalPoll;
  showId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLocation, setBulkLocation] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const totals = useMemo(
    () =>
      new Map(
        poll.slots.map((slot) => [
          slot.id,
          poll.responses.filter(
            (response) =>
              response.slotId === slot.id && response.availability === "yes",
          ).length,
        ]),
      ),
    [poll],
  );
  const link =
    typeof window === "undefined"
      ? `/repetitions/${poll.token}`
      : `${window.location.origin}/repetitions/${poll.token}`;
  return (
    <section className="border-t border-border pt-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold">{poll.title}</h4>
            <Badge tone={poll.status === "open" ? "success" : "info"}>
              {poll.status === "open" ? "Ouvert" : "Fermé"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {poll.participants.filter((p) => p.respondedAt).length} réponse(s)
            sur {poll.participants.length}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setMessage("");
              } catch {
                setMessage(
                  "La copie automatique est bloquée. Sélectionnez le lien ci-dessous.",
                );
              }
            }}
            type="button"
            variant="secondary"
          >
            {copied ? (
              <Check aria-hidden className="mr-2 h-4 w-4" />
            ) : (
              <Copy aria-hidden className="mr-2 h-4 w-4" />
            )}
            {copied ? "Lien copié" : "Copier le lien"}
          </Button>
          <a
            className="max-w-xs break-all text-xs text-accent hover:underline"
            href={link}
          >
            {link}
          </a>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-3 py-3 font-medium">Confirmer</th>
              <th className="px-3 py-3 font-medium">Créneau</th>
              <th className="px-3 py-3 font-medium">Lieu</th>
              <th className="px-3 py-3 text-center font-medium">Disponibles</th>
              {poll.participants.map((participant) => (
                <th
                  className="px-3 py-3 text-center font-medium"
                  key={participant.id}
                >
                  {participant.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {poll.slots.map((slot) => (
              <tr className="border-b border-border" key={slot.id}>
                <td className="px-3 py-4">
                  <input
                    aria-label={`Sélectionner le créneau du ${slot.date}`}
                    checked={selected.includes(slot.id)}
                    className="h-4 w-4 accent-accent"
                    disabled={slot.confirmed}
                    onChange={(e) =>
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, slot.id]
                          : current.filter((id) => id !== slot.id),
                      )
                    }
                    type="checkbox"
                  />
                </td>
                <td className="px-3 py-4">
                  <p className="font-medium">
                    {new Date(`${slot.date}T12:00:00`).toLocaleDateString(
                      "fr-FR",
                      { weekday: "short", day: "numeric", month: "short" },
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Clock3 aria-hidden className="h-3.5 w-3.5" />
                    {slot.startTime}–{slot.endTime}
                  </p>
                </td>
                <td className="px-3 py-4 text-muted">
                  {slot.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden className="h-3.5 w-3.5" />
                      {slot.location}
                    </span>
                  ) : (
                    "À préciser"
                  )}
                </td>
                <td className="px-3 py-4 text-center font-semibold">
                  {totals.get(slot.id) ?? 0}/{poll.participants.length}
                </td>
                {poll.participants.map((participant) => {
                  const answer = poll.responses.find(
                    (response) =>
                      response.slotId === slot.id &&
                      response.participantId === participant.id,
                  )?.availability;
                  return (
                    <td className="px-3 py-4 text-center" key={participant.id}>
                      <span
                        className={
                          answer === "yes"
                            ? "text-success"
                            : answer === "maybe"
                              ? "text-warning"
                              : answer === "no"
                                ? "text-danger"
                                : "text-muted"
                        }
                      >
                        {answer ? responseLabels[answer] : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1 text-xs font-medium text-muted">
            Nouveau lieu pour la sélection
            <Input
              className="mt-1"
              placeholder="Studio, salle, adresse…"
              value={bulkLocation}
              onChange={(event) => setBulkLocation(event.target.value)}
            />
          </label>
          <Button
            disabled={!selected.length || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateRehearsalSlotLocations(
                  showId,
                  poll.id,
                  selected,
                  bulkLocation,
                );
                setMessage(result.message);
                if (result.ok) {
                  setSelected([]);
                  router.refresh();
                }
              })
            }
            type="button"
            variant="secondary"
          >
            <MapPin aria-hidden className="mr-2 h-4 w-4" />
            Appliquer à {selected.length || 0}
          </Button>
        </div>
        <Button
          disabled={!selected.length || isPending}
          onClick={() =>
            startTransition(async () =>
              setMessage(
                (await confirmRehearsalSlots(showId, poll.id, selected))
                  .message,
              ),
            )
          }
          type="button"
        >
          <CalendarCheck aria-hidden className="mr-2 h-4 w-4" />
          {isPending ? "Enregistrement…" : "Confirmer dans l’agenda"}
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-muted">
        {message}
      </p>
    </section>
  );
}
