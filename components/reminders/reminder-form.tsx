"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createReminder } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { reminderSchema, type ReminderFormInput, type ReminderFormValues } from "@/lib/validation/pipeline";

export function ReminderForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormInput, unknown, ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      dueDate: new Date().toISOString().slice(0, 10),
      relatedTo: "",
      priority: "normal",
    },
  });

  function onSubmit(values: ReminderFormValues) {
    startTransition(async () => {
      const result = await createReminder(values);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        reset();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Action a faire" error={errors.title?.message}>
        <Input placeholder="Appeler, envoyer le dossier, verifier une date..." {...register("title")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date" error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </Field>
        <Field label="Priorite" error={errors.priority?.message}>
          <Select {...register("priority")}>
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
          </Select>
        </Field>
        <Field label="Lie a" error={errors.relatedTo?.message}>
          <Input placeholder="Contact, lieu, spectacle..." {...register("relatedTo")} />
        </Field>
      </div>
      {message ? (
        <p
          className={
            message.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {message.text}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || isPending}>
        Ajouter l&apos;action
      </Button>
    </form>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </label>
  );
}
