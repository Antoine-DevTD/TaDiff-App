"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { deleteQuote, updateQuote } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  quoteSchema,
  quoteStatuses,
  type QuoteFormInput,
  type QuoteFormValues,
} from "@/lib/validation/billing";
import type { QuoteItem } from "@/types";

export function QuoteEditForm({ quote }: { quote: QuoteItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput, unknown, QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      title: quote.title,
      organization: quote.organization,
      status: quote.status,
      amount: quote.amount,
      depositDue: quote.depositDue,
      balanceDue: quote.balanceDue,
      dueDate: quote.dueDate || "",
    },
  });

  function onSubmit(values: QuoteFormValues) {
    startTransition(async () => {
      const result = await updateQuote(quote.id, values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objet" error={errors.title?.message}>
          <Input {...register("title")} />
        </Field>
        <Field label="Structure" error={errors.organization?.message}>
          <Input {...register("organization")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            {quoteStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Échéance" error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Montant HT" error={errors.amount?.message}>
          <Input min="0" step="1" type="number" {...register("amount")} />
        </Field>
        <Field label="Acompte" error={errors.depositDue?.message}>
          <Input min="0" step="1" type="number" {...register("depositDue")} />
        </Field>
        <Field label="Solde" error={errors.balanceDue?.message}>
          <Input min="0" step="1" type="number" {...register("balanceDue")} />
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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || isPending}>
          Enregistrer le devis
        </Button>
        <ConfirmDeleteButton
          action={deleteQuote.bind(null, quote.id)}
          label="Supprimer le devis"
          redirectTo="/billing"
        />
      </div>
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
