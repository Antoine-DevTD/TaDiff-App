"use client";

import { Check, MessageSquareText } from "lucide-react";
import { useState, useTransition } from "react";
import { completeReminder } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";

const outcomes: Array<{
  id: NonNullable<Reminder["completionOutcome"]>;
  label: string;
}> = [
  { id: "positive", label: "Ça avance" },
  { id: "follow_up", label: "À poursuivre" },
  { id: "no_answer", label: "Pas de réponse" },
  { id: "negative", label: "Sans suite" },
  { id: "other", label: "Autre" },
];

export function ReminderCompletionDialog({
  open,
  reminder,
  onClose,
  onCompleted,
}: {
  open: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onCompleted: (values: {
    completedAt: string;
    outcome?: Reminder["completionOutcome"];
    note?: string;
  }) => void;
}) {
  const [outcome, setOutcome] = useState<Reminder["completionOutcome"]>();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    if (isPending) return;
    setOutcome(undefined);
    setNote("");
    setError(null);
    onClose();
  }

  function confirm(skipDetails = false) {
    if (!reminder) return;
    const values = skipDetails ? {} : { outcome, note: note.trim() || undefined };
    startTransition(async () => {
      setError(null);
      const result = await completeReminder(reminder.id, values);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      onCompleted({
        completedAt: result.reminder?.completedAt ?? new Date().toISOString(),
        outcome: skipDetails ? undefined : outcome,
        note: skipDetails ? undefined : note.trim() || undefined,
      });
      setOutcome(undefined);
      setNote("");
      setError(null);
      onClose();
    });
  }

  return (
    <Dialog
      className="max-w-xl"
      description="Gardez une trace utile de ce qui s'est passé. William pourra s'appuyer dessus pour vous conseiller."
      eyebrow="Action terminée"
      open={open}
      title="Bravo ! Sur quoi cette action a-t-elle débouché ?"
      onClose={close}
    >
      {reminder ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-md bg-success/8 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/12 text-success">
              <Check aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">{reminder.label}</p>
              <p className="mt-1 text-sm text-muted">Une phrase suffit. Vous pourrez rouvrir l&apos;action ensuite.</p>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold">Résultat</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {outcomes.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={outcome === item.id}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-medium transition",
                    outcome === item.id
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-panel hover:border-accent/45 hover:text-accent",
                  )}
                  disabled={isPending}
                  type="button"
                  onClick={() => setOutcome(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold">
            Petit compte rendu <span className="font-normal text-muted">(facultatif)</span>
            <Textarea
              className="mt-2 min-h-28"
              maxLength={2_000}
              placeholder="Ex. Bon échange, envoyer le dossier lundi puis rappeler dans deux semaines."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {error ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <Button disabled={isPending} type="button" variant="ghost" onClick={() => confirm(true)}>
              Terminer sans compte rendu
            </Button>
            <Button disabled={isPending} type="button" onClick={() => confirm(false)}>
              <MessageSquareText aria-hidden="true" className="mr-2 h-4 w-4" />
              {isPending ? "Enregistrement..." : "Enregistrer le résultat"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
