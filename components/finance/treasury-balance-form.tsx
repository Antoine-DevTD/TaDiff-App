"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { recordTreasuryBalance } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  treasuryBalanceSchema,
  type TreasuryBalanceFormInput,
  type TreasuryBalanceFormValues,
} from "@/lib/validation/finance";
import type { TreasurySnapshot } from "@/types";

export function TreasuryBalanceForm({
  currentBalance,
  onRecorded,
}: {
  currentBalance: number | null;
  onRecorded?: (snapshot: TreasurySnapshot) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TreasuryBalanceFormInput, unknown, TreasuryBalanceFormValues>({
    resolver: zodResolver(treasuryBalanceSchema),
    defaultValues: {
      balance: currentBalance ?? 0,
      note: "",
    },
  });

  function onSubmit(values: TreasuryBalanceFormValues) {
    startTransition(async () => {
      const result = await recordTreasuryBalance(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset({ balance: values.balance, note: "" });
        if (result.treasurySnapshot) onRecorded?.(result.treasurySnapshot);
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Solde bancaire actuel (EUR)" error={errors.balance?.message}>
          <Input step="1" type="number" {...register("balance")} />
        </Field>
        <Field label="Note (optionnel)" error={errors.note?.message}>
          <Input placeholder="Après paiement des salaires..." {...register("note")} />
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
        Mettre à jour le solde
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
