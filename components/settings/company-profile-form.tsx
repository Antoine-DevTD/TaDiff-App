"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { updateCompanyProfile } from "@/app/(dashboard)/actions";
import { PosterUploadField } from "@/components/shows/poster-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  companyProfileSchema,
  type CompanyProfileInput,
  type CompanyProfileValues,
} from "@/lib/validation/company";
import type { CompanyProfile } from "@/types";

export function CompanyProfileForm({
  profile,
  canManage,
}: {
  profile: CompanyProfile;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompanyProfileInput, unknown, CompanyProfileValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: profile.name,
      city: profile.city,
      discipline: profile.discipline,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      siret: profile.siret,
      licenseNumber: profile.licenseNumber,
      logoUrl: profile.logoUrl,
      description: profile.description,
    },
  });

  const logoUrl = useWatch({ control, name: "logoUrl" }) ?? "";

  function onSubmit(values: CompanyProfileValues) {
    startTransition(async () => {
      const result = await updateCompanyProfile(values);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={!canManage} className="space-y-4">
        <Field label="Nom de la compagnie" error={errors.name?.message}>
          <Input placeholder="Compagnie de l'Estran" {...register("name")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville" error={errors.city?.message}>
            <Input placeholder="Brest" {...register("city")} />
          </Field>
          <Field label="Discipline principale" error={errors.discipline?.message}>
            <Input placeholder="Théâtre, danse..." {...register("discipline")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de contact" error={errors.email?.message}>
            <Input type="email" placeholder="contact@compagnie.fr" {...register("email")} />
          </Field>
          <Field label="Telephone" error={errors.phone?.message}>
            <Input placeholder="06 12 34 56 78" {...register("phone")} />
          </Field>
        </div>

        <Field label="Site web" error={errors.website?.message}>
          <Input type="url" placeholder="https://compagnie.fr" {...register("website")} />
        </Field>

        <Field label="Logo de la compagnie" error={errors.logoUrl?.message}>
          <input type="hidden" {...register("logoUrl")} />
          <PosterUploadField
            showId="logo"
            value={logoUrl}
            maxDimension={512}
            chooseLabel="Choisir un logo (JPG, PNG, WebP)"
            emptyHint="Aucun logo pour l'instant. L'image sera stockée dans TaDiff."
            onChange={(url) =>
              setValue("logoUrl", url, { shouldDirty: true, shouldValidate: true })
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SIRET" error={errors.siret?.message}>
            <Input placeholder="123 456 789 00012" {...register("siret")} />
          </Field>
          <Field label="Numéro de licence" error={errors.licenseNumber?.message}>
            <Input placeholder="PLATESV-..." {...register("licenseNumber")} />
          </Field>
        </div>

        <Field label="Présentation courte" error={errors.description?.message}>
          <Textarea
            placeholder="Objet de la compagnie, esthétique, projets phares..."
            {...register("description")}
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

        {canManage ? (
          <Button type="submit" disabled={isSubmitting || isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer le profil"}
          </Button>
        ) : (
          <p className="text-xs text-muted">
            Seuls les rôles owner et admin peuvent modifier le profil de la compagnie.
          </p>
        )}
      </fieldset>
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
