"use client";

import { useState, useTransition } from "react";
import { completeReminder } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import type { Reminder } from "@/types";

function getReminderTone(reminder: Reminder) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(reminder.dueDate);

  if (reminder.done) return "success";
  if (due < today) return "danger";
  if (reminder.priority === "high") return "warning";
  return "neutral";
}

function getReminderWeight(reminder: Reminder) {
  if (reminder.done) return 3;
  if (getReminderTone(reminder) === "danger") return 0;
  if (reminder.priority === "high") return 1;
  return 2;
}

function getPriorityLabel(priority: Reminder["priority"]) {
  if (priority === "high") return "Urgent";
  if (priority === "low") return "Faible";
  return "Normal";
}

export function RemindersList({ reminders }: { reminders: Reminder[] }) {
  const [items, setItems] = useState(
    [...reminders].sort((a, b) => {
      const weightDiff = getReminderWeight(a) - getReminderWeight(b);

      if (weightDiff !== 0) {
        return weightDiff;
      }

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }),
  );
  const [isPending, startTransition] = useTransition();

  function markDone(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, done: true } : item)),
    );
    startTransition(async () => {
      await completeReminder(id);
    });
  }

  return (
    <div className="space-y-3">
      {items.map((reminder) => (
        <div
          key={reminder.id}
          className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className={reminder.done ? "font-medium text-muted line-through" : "font-medium"}>
                {reminder.label}
              </p>
              <Badge tone={getReminderTone(reminder)}>
                {reminder.done ? "Fait" : getPriorityLabel(reminder.priority)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {reminder.relatedTo || "Sans lien"} -{" "}
              {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <button
            className="rounded-md border border-border px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-foreground disabled:opacity-50"
            disabled={reminder.done || isPending}
            type="button"
            onClick={() => markDone(reminder.id)}
          >
            Marquer fait
          </button>
        </div>
      ))}
    </div>
  );
}
