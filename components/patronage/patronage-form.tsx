"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createPatronageDeal } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  patronageSchema,
  patronageStatuses,
  type PatronageFormInput,
  type PatronageFormValues,
} from "@/lib/validation/patronage";

const defaultValues: PatronageFormInput = {
  companyName: "",
  contactName: "",
  amount: 0,
  status: "Prospect",
  nextAction: "",
  nextFollowUpAt: "",
};

export function PatronageForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PatronageFormInput, unknown, PatronageFormValues>({
    resolver: zodResolver(patronageSchema),
    defaultValues,
  });

  function onSubmit(values: PatronageFormValues) {
    startTransition(async () => {
      const result = await createPatronageDeal(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset(defaultValues);
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Entreprise / fondation" error={errors.companyName?.message}>
          <Input placeholder="Fondation Horizon" {...register("companyName")} />
        </Field>
        <Field label="Contact" error={errors.contactName?.message}>
          <Input placeholder="Nom du contact" {...register("contactName")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Montant vise (EUR)" error={errors.amount?.message}>
          <Input min="0" step="100" type="number" {...register("amount")} />
        </Field>
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            {patronageStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prochaine action" error={errors.nextAction?.message}>
          <Input placeholder="Envoyer l'argumentaire fiscal..." {...register("nextAction")} />
        </Field>
        <Field label="Relance prevue" error={errors.nextFollowUpAt?.message}>
          <Input type="date" {...register("nextFollowUpAt")} />
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
        Ajouter le partenaire
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
