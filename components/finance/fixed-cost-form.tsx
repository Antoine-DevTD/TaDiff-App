"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createFixedCost, updateFixedCost } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fixedCostSchema,
  type FixedCostFormInput,
  type FixedCostFormValues,
} from "@/lib/validation/finance";
import type { FixedCost } from "@/types";

const defaultValues: FixedCostFormInput = {
  label: "",
  category: "Autre",
  amount: 0,
  frequency: "Mensuel",
  nextDueDate: "",
  notes: "",
};

export function FixedCostForm({
  cost,
  onSaved,
}: {
  cost?: FixedCost;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FixedCostFormInput, unknown, FixedCostFormValues>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: cost
      ? {
          label: cost.label,
          category: cost.category,
          amount: cost.amount,
          frequency: cost.frequency,
          nextDueDate: cost.nextDueDate,
          notes: cost.notes || "",
        }
      : defaultValues,
  });

  function onSubmit(values: FixedCostFormValues) {
    startTransition(async () => {
      const result = cost
        ? await updateFixedCost(cost.id, values)
        : await createFixedCost(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        if (!cost) {
          reset(defaultValues);
        }

        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Libelle" error={errors.label?.message}>
        <Input placeholder="Assurance responsabilite civile" {...register("label")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categorie" error={errors.category?.message}>
          <Select {...register("category")}>
            {[
              "Assurance",
              "Banque",
              "Comptable",
              "Stockage",
              "Logiciel",
              "Local",
              "Salaire",
              "Autre",
            ].map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Frequence" error={errors.frequency?.message}>
          <Select {...register("frequency")}>
            <option value="Mensuel">Mensuel</option>
            <option value="Trimestriel">Trimestriel</option>
            <option value="Annuel">Annuel</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Montant" error={errors.amount?.message}>
          <Input min="0" step="1" type="number" {...register("amount")} />
        </Field>
        <Field label="Prochaine echeance" error={errors.nextDueDate?.message}>
          <Input type="date" {...register("nextDueDate")} />
        </Field>
      </div>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea placeholder="Contrat, renouvellement, commentaire..." {...register("notes")} />
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
        {cost ? "Enregistrer le frais fixe" : "Ajouter le frais fixe"}
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
