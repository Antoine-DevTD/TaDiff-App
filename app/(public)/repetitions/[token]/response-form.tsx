"use client";

import { Check, HelpCircle, MapPin, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { submitRehearsalResponse } from "./actions";

type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  confirmed: boolean;
};
type Participant = {
  id: string;
  name: string;
  comment: string | null;
  respondedAt: string | null;
};
type ExistingResponse = {
  participantId: string;
  slotId: string;
  availability: "yes" | "maybe" | "no";
};
const choices = [
  { value: "yes" as const, label: "Disponible", icon: Check },
  { value: "maybe" as const, label: "Si besoin", icon: HelpCircle },
  { value: "no" as const, label: "Indisponible", icon: X },
];

function weekKey(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

export function ResponseForm({
  participants,
  responses,
  slots,
  token,
}: {
  participants: Participant[];
  responses: ExistingResponse[];
  slots: Slot[];
  token: string;
}) {
  const [participantId, setParticipantId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<
    Record<string, "yes" | "maybe" | "no">
  >({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.id === participantId),
    [participantId, participants],
  );
  function selectParticipant(value: string) {
    setParticipantId(value);
    const participant = participants.find((item) => item.id === value);
    setComment(participant?.comment ?? "");
    setAnswers(
      Object.fromEntries(
        responses
          .filter((response) => response.participantId === value)
          .map((response) => [response.slotId, response.availability]),
      ),
    );
  }
  function submit() {
    startTransition(async () => {
      const result = await submitRehearsalResponse({
        token,
        participantId: participantId === "new" ? null : participantId || null,
        displayName,
        comment,
        responses: Object.entries(answers).map(([slotId, availability]) => ({
          slotId,
          availability,
        })),
      });
      setMessage(result.message);
      if (result.ok && result.participantId)
        setParticipantId(result.participantId);
    });
  }
  return (
    <div className="space-y-7">
      <section>
        <label className="block text-sm font-semibold">
          Qui êtes-vous ?
          <Select
            className="mt-2"
            value={participantId}
            onChange={(event) => selectParticipant(event.target.value)}
          >
            <option value="">Choisir votre nom</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
                {participant.respondedAt ? " · réponse enregistrée" : ""}
              </option>
            ))}
            <option value="new">Mon nom n’est pas dans la liste</option>
          </Select>
        </label>
        {participantId === "new" ? (
          <label className="mt-4 block text-sm font-semibold">
            Votre nom
            <Input
              autoComplete="name"
              className="mt-2"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        ) : null}
        {selectedParticipant?.respondedAt ? (
          <p className="mt-3 text-sm text-muted">
            Votre réponse précédente est affichée ci-dessous. Vous pouvez la
            modifier.
          </p>
        ) : null}
      </section>
      {participantId ? (
        <fieldset>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <legend className="text-lg font-semibold">
                Vos disponibilités
              </legend>
              <p className="mt-1 text-sm text-muted">
                Choisissez une réponse sur chaque créneau, semaine par semaine.
              </p>
            </div>
            <Button
              onClick={() =>
                setAnswers(
                  Object.fromEntries(slots.map((slot) => [slot.id, "yes"])),
                )
              }
              type="button"
              variant="secondary"
            >
              Tout marquer disponible
            </Button>
          </div>
          <div className="mt-4 space-y-6">
            {Array.from(new Set(slots.map((slot) => weekKey(slot.date)))).map(
              (week) => {
                const weekSlots = slots.filter(
                  (slot) => weekKey(slot.date) === week,
                );
                const days = Array.from(
                  new Set(weekSlots.map((slot) => slot.date)),
                );
                return (
                  <section className="overflow-x-auto" key={week}>
                    <h3 className="mb-2 text-sm font-semibold">
                      Semaine du{" "}
                      {new Date(`${week}T12:00:00`).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "long" },
                      )}
                    </h3>
                    <div className="grid min-w-[52rem] grid-cols-7 gap-2">
                      {Array.from({ length: 7 }, (_, offset) => {
                        const date = new Date(`${week}T12:00:00`);
                        date.setDate(date.getDate() + offset);
                        const dateKey = date.toISOString().slice(0, 10);
                        const daySlots = days.includes(dateKey)
                          ? weekSlots.filter((slot) => slot.date === dateKey)
                          : [];
                        return (
                          <div className="min-w-0" key={dateKey}>
                            <div className="border-b border-border pb-2 text-center">
                              <p className="text-xs font-medium uppercase text-muted">
                                {date.toLocaleDateString("fr-FR", {
                                  weekday: "short",
                                })}
                              </p>
                              <p className="text-sm font-semibold">
                                {date.getDate()}
                              </p>
                            </div>
                            <div className="mt-2 space-y-2">
                              {daySlots.map((slot) => (
                                <article
                                  className="rounded-md border border-border bg-panel p-2"
                                  key={slot.id}
                                >
                                  <p className="text-center text-xs font-semibold">
                                    {slot.startTime.slice(0, 5)}–
                                    {slot.endTime.slice(0, 5)}
                                  </p>
                                  {slot.location ? (
                                    <p className="mt-1 flex items-start gap-1 text-[11px] text-muted">
                                      <MapPin
                                        aria-hidden
                                        className="mt-0.5 h-3 w-3 shrink-0"
                                      />
                                      {slot.location}
                                    </p>
                                  ) : null}
                                  <div className="mt-2 grid grid-cols-3 gap-1">
                                    {choices.map(
                                      ({ value, label, icon: Icon }) => {
                                        const selected =
                                          answers[slot.id] === value;
                                        const selectedClass =
                                          value === "yes"
                                            ? "bg-success text-white"
                                            : value === "maybe"
                                              ? "bg-warning text-white"
                                              : "bg-danger text-white";
                                        return (
                                          <button
                                            aria-label={`${label}, ${date.toLocaleDateString("fr-FR")} de ${slot.startTime.slice(0, 5)} à ${slot.endTime.slice(0, 5)}`}
                                            aria-pressed={selected}
                                            className={`flex min-h-9 items-center justify-center rounded-sm border border-border ${selected ? selectedClass : "bg-background text-muted hover:border-accent"}`}
                                            key={value}
                                            onClick={() =>
                                              setAnswers((current) => ({
                                                ...current,
                                                [slot.id]: value,
                                              }))
                                            }
                                            title={label}
                                            type="button"
                                          >
                                            <Icon
                                              aria-hidden
                                              className="h-3.5 w-3.5"
                                            />
                                          </button>
                                        );
                                      },
                                    )}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              },
            )}
          </div>
        </fieldset>
      ) : null}
      {participantId ? (
        <label className="block text-sm font-semibold">
          Un détail à transmettre ?{" "}
          <span className="font-normal text-muted">(facultatif)</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-border bg-panel p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            maxLength={500}
            placeholder="Je dois partir à 17 h, je peux arriver plus tôt…"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      ) : null}
      {participantId ? (
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <Button
            disabled={
              isPending ||
              Object.keys(answers).length !== slots.length ||
              (participantId === "new" && displayName.trim().length < 2)
            }
            onClick={submit}
            type="button"
          >
            {isPending ? "Enregistrement…" : "Envoyer mes disponibilités"}
          </Button>
          {message ? (
            <p aria-live="polite" className="text-sm text-muted">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
