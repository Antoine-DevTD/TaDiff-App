"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createGrantOpportunity } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showDocumentTypes } from "@/lib/show-documents";
import {
  grantSchema,
  grantStatuses,
  type GrantFormInput,
  type GrantFormValues,
} from "@/lib/validation/grant";
import type { Show } from "@/types";

const defaultValues: GrantFormInput = {
  title: "",
  funder: "",
  territory: "",
  discipline: "",
  deadline: "",
  amount: 0,
  status: "A surveiller",
  relatedShowId: "",
  requirements: [],
  eligibility: "",
  sourceUrl: "",
};

export function GrantForm({ shows, onSuccess }: { shows: Show[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GrantFormInput, unknown, GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues,
  });

  function onSubmit(values: GrantFormValues) {
    startTransition(async () => {
      const result = await createGrantOpportunity(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset(defaultValues);
        router.refresh();
        onSuccess?.();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du dispositif" error={errors.title?.message}>
          <Input placeholder="Aide a la creation" {...register("title")} />
        </Field>
        <Field label="Organisme" error={errors.funder?.message}>
          <Input placeholder="DRAC, Region, Adami..." {...register("funder")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date limite" error={errors.deadline?.message}>
          <Input type="date" {...register("deadline")} />
        </Field>
        <Field label="Montant vise (EUR)" error={errors.amount?.message}>
          <Input min="0" step="100" type="number" {...register("amount")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            {grantStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Spectacle concerne" error={errors.relatedShowId?.message}>
          <Select {...register("relatedShowId")}>
            <option value="">Aucun pour l instant</option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Territoire" error={errors.territory?.message}>
          <Input placeholder="Region, France, Europe..." {...register("territory")} />
        </Field>
        <Field label="Discipline" error={errors.discipline?.message}>
          <Input placeholder="Theatre, musique, toutes..." {...register("discipline")} />
        </Field>
      </div>

      <Field label="Pieces demandees" error={errors.requirements?.message}>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-panel-strong/35 p-3 sm:grid-cols-3">
          {showDocumentTypes.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" value={type} {...register("requirements")} />
              {type}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Lien officiel" error={errors.sourceUrl?.message}>
        <Input placeholder="https://..." type="url" {...register("sourceUrl")} />
      </Field>

      <Field label="Eligibilite / notes" error={errors.eligibility?.message}>
        <Textarea
          placeholder="Conditions, calendrier de commission, points de vigilance..."
          {...register("eligibility")}
        />
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
        Ajouter au radar
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
