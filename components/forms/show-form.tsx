"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createShow } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  showSchema,
  type ShowFormInput,
  type ShowFormValues,
} from "@/lib/validation/show";

const defaultValues: ShowFormInput = {
  title: "",
  discipline: "Theatre",
  status: "En diffusion",
  nextDate: "",
  budget: 0,
  notes: "",
};

export function ShowForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShowFormInput, unknown, ShowFormValues>({
    resolver: zodResolver(showSchema),
    defaultValues,
  });

  function onSubmit(values: ShowFormValues) {
    startTransition(async () => {
      const result = await createShow(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.push("/shows");
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Titre" error={errors.title?.message}>
        <Input placeholder="Les lignes de fuite" {...register("title")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Discipline" error={errors.discipline?.message}>
          <Select {...register("discipline")}>
            <option value="Theatre">Theatre</option>
            <option value="Danse">Danse</option>
            <option value="Musique">Musique</option>
            <option value="Cirque">Cirque</option>
            <option value="Jeune public">Jeune public</option>
          </Select>
        </Field>
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="En diffusion">En diffusion</option>
            <option value="Creation">Creation</option>
            <option value="En pause">En pause</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prochaine date" error={errors.nextDate?.message}>
          <Input type="date" {...register("nextDate")} />
        </Field>
        <Field label="Budget previsionnel" error={errors.budget?.message}>
          <Input type="number" min="0" step="100" {...register("budget")} />
        </Field>
      </div>

      <Field label="Note de production" error={errors.notes?.message}>
        <Textarea placeholder="Distribution, jauge, besoins techniques..." {...register("notes")} />
      </Field>

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
        Creer le spectacle
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
