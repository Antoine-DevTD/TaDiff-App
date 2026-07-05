"use client";

import { useState, useTransition } from "react";
import { completeReminder, deleteReminder, updateReminder } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<Reminder["priority"]>("normal");
  const [editError, setEditError] = useState<string | null>(null);

  function markDone(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, done: true } : item)),
    );
    startTransition(async () => {
      await completeReminder(id);
    });
  }

  function startEditing(reminder: Reminder) {
    setEditingId(reminder.id);
    setEditTitle(reminder.label);
    setEditDueDate(reminder.dueDate);
    setEditPriority(reminder.priority);
    setEditError(null);
  }

  function saveEdit(reminder: Reminder) {
    if (editTitle.trim().length < 2 || !editDueDate) {
      setEditError("Titre et date sont requis.");
      return;
    }

    const nextTitle = editTitle.trim();
    const nextDueDate = editDueDate;
    const nextPriority = editPriority;

    setItems((current) =>
      current.map((item) =>
        item.id === reminder.id
          ? { ...item, label: nextTitle, dueDate: nextDueDate, priority: nextPriority }
          : item,
      ),
    );
    setEditingId(null);
    startTransition(async () => {
      await updateReminder(reminder.id, {
        title: nextTitle,
        dueDate: nextDueDate,
        priority: nextPriority,
        relatedTo: reminder.relatedTo || "",
      });
    });
  }

  function removeReminder(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }

    setConfirmingId(null);
    setItems((current) => current.filter((item) => item.id !== id));
    startTransition(async () => {
      await deleteReminder(id);
    });
  }

  return (
    <div className="space-y-3">
      {items.map((reminder) => (
        <div key={reminder.id} className="rounded-lg border border-border bg-panel p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
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
            <div className="flex items-center gap-3">
              <button
                className="rounded-md border border-border px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-foreground disabled:opacity-50"
                disabled={reminder.done || isPending}
                type="button"
                onClick={() => markDone(reminder.id)}
              >
                Marquer fait
              </button>
              <button
                className="text-sm font-medium text-accent transition hover:text-accent-strong disabled:opacity-50"
                disabled={reminder.done || isPending}
                type="button"
                onClick={() =>
                  editingId === reminder.id ? setEditingId(null) : startEditing(reminder)
                }
              >
                {editingId === reminder.id ? "Fermer" : "Modifier"}
              </button>
              <button
                className="text-sm font-medium text-danger/80 transition hover:text-danger disabled:opacity-50"
                disabled={isPending}
                type="button"
                onClick={() => removeReminder(reminder.id)}
                onBlur={() => setConfirmingId(null)}
              >
                {confirmingId === reminder.id ? "Confirmer" : "Supprimer"}
              </button>
            </div>
          </div>

          {editingId === reminder.id ? (
            <div className="mt-4 space-y-3 rounded-md border border-border bg-panel-strong/35 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium sm:col-span-1">
                  Titre
                  <div className="mt-2">
                    <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                  </div>
                </label>
                <label className="block text-sm font-medium">
                  Echeance
                  <div className="mt-2">
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(event) => setEditDueDate(event.target.value)}
                    />
                  </div>
                </label>
                <label className="block text-sm font-medium">
                  Priorite
                  <div className="mt-2">
                    <Select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(event.target.value as Reminder["priority"])
                      }
                    >
                      <option value="low">Faible</option>
                      <option value="normal">Normal</option>
                      <option value="high">Urgent</option>
                    </Select>
                  </div>
                </label>
              </div>
              {editError ? <p className="text-xs text-danger">{editError}</p> : null}
              <Button type="button" disabled={isPending} onClick={() => saveEdit(reminder)}>
                Enregistrer la relance
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
