"use client";

import Link from "next/link";
import { useState } from "react";
import { ShowActionDialog } from "@/components/shows/show-action-dialog";
import type { Contact, Reminder, Show } from "@/types";

export function ShowActionsPanel({
  contacts,
  currentShowId,
  initialReminders,
  shows,
}: {
  contacts: Contact[];
  currentShowId: string;
  initialReminders: Reminder[];
  shows: Show[];
}) {
  const [reminders, setReminders] = useState(initialReminders);

  function addReminder(reminder: Reminder) {
    if (reminder.showId && reminder.showId !== currentShowId) return;
    setReminders((current) =>
      current.some((item) => item.id === reminder.id) ? current : [...current, reminder],
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Actions à faire</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link className="text-sm font-medium text-accent hover:text-accent-strong" href="/reminders">
            Toutes les actions
          </Link>
          <ShowActionDialog
            contacts={contacts}
            currentShowId={currentShowId}
            shows={shows}
            onCreated={addReminder}
          />
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucune action ouverte pour ce spectacle. Utilisez le bouton ci-dessus pour ajouter la prochaine étape.
        </div>
      ) : (
        reminders.map((reminder) => (
          <Link
            key={reminder.id}
            className="block border-b border-border py-4 transition-colors hover:text-accent"
            href="/reminders"
          >
            <p className="text-sm font-medium">{reminder.label}</p>
            <p className="mt-1 text-xs text-muted">
              {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
            </p>
          </Link>
        ))
      )}
    </section>
  );
}
