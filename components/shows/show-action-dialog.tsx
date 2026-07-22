"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { Button } from "@/components/ui/button";
import type { Contact, Reminder, Show } from "@/types";

export function ShowActionDialog({
  contacts,
  currentShowId,
  onCreated,
  shows,
}: {
  contacts: Contact[];
  currentShowId: string;
  onCreated?: (reminder: Reminder) => void;
  shows: Show[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
        Ajouter une action
      </Button>
      <ReminderForm
        contacts={contacts}
        initialShowId={currentShowId}
        open={open}
        shows={shows}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />
    </>
  );
}
