"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { adminUpdateCompanyBilling } from "@/app/(dashboard)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminCompany } from "@/lib/supabase/admin";
import {
  adminBillingSchema,
  billingStatuses,
  type AdminBillingFormInput,
  type AdminBillingFormValues,
} from "@/lib/validation/admin";

const statusLabels: Record<(typeof billingStatuses)[number], string> = {
  pending_payment: "En attente de paiement",
  trial: "Essai",
  active: "Abonnement actif",
  comped: "Compte offert",
  past_due: "Paiement en retard",
  cancelled: "Résilié",
};

export function CompanyBillingForm({ company }: { company: AdminCompany }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const formId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminBillingFormInput, unknown, AdminBillingFormValues>({
    resolver: zodResolver(adminBillingSchema),
    defaultValues: {
      billingStatus: company.billingStatus,
      planCode: company.planCode,
      compedUntil: company.compedUntil ?? "",
      billingNotes: company.billingNotes,
    },
  });

  useEffect(() => {
    if (!open) reset({ billingStatus: company.billingStatus, planCode: company.planCode, compedUntil: company.compedUntil ?? "", billingNotes: company.billingNotes });
  }, [company.billingStatus, company.planCode, company.compedUntil, company.billingNotes, open, reset]);

  function onSubmit(values: AdminBillingFormValues) {
    startTransition(async () => {
      try {
        const result = await adminUpdateCompanyBilling(company.id, values);
        setMessage({ ok: result.ok, text: result.message });

        if (result.ok) {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setMessage({ ok: false, text: "L’accès n’a pas pu être enregistré. Réessayez ; votre saisie est conservée." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        className="min-h-11 rounded-md px-1 text-sm font-medium text-accent transition hover:text-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        type="button"
        aria-expanded={open}
        aria-controls={formId}
        disabled={isSubmitting || isPending}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Fermer les réglages" : "Accès et facturation"}
      </button>

      {open ? (
        <form
          id={formId}
          aria-label={`Accès et facturation de ${company.name}`}
          className="space-y-3 rounded-md border border-border bg-panel p-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Statut" error={errors.billingStatus?.message}>
              <Select {...register("billingStatus")}>
                {billingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Offre" error={errors.planCode?.message}>
              <Input placeholder="bêta" {...register("planCode")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Offert jusqu’au (vide = sans limite)" error={errors.compedUntil?.message}>
              <Input type="date" {...register("compedUntil")} />
            </Field>
            <Field label="Note interne" error={errors.billingNotes?.message}>
              <Input placeholder="Pourquoi ce statut, qui a décidé…" {...register("billingNotes")} />
            </Field>
          </div>
          {message && !message.ok ? (
            <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{message.text}</p>
          ) : null}
          <Button type="submit" disabled={isSubmitting || isPending}>
            {isPending || isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      ) : null}
      {message?.ok && !open ? <p role="status" className="text-xs text-success">{message.text}</p> : null}
    </div>
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
