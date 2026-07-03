"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createShowDocument } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showDocumentStatuses, showDocumentTypes } from "@/lib/show-documents";
import {
  showDocumentSchema,
  type ShowDocumentFormInput,
  type ShowDocumentFormValues,
} from "@/lib/validation/document";

type ShowDocumentFormProps = {
  showId: string;
};

export function ShowDocumentForm({ showId }: ShowDocumentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ShowDocumentFormInput, unknown, ShowDocumentFormValues>({
    resolver: zodResolver(showDocumentSchema),
    defaultValues: {
      showId,
      title: "",
      documentType: "Dossier artistique",
      status: "Pret",
      fileUrl: "",
      notes: "",
    },
  });

  function onSubmit(values: ShowDocumentFormValues) {
    startTransition(async () => {
      const result = await createShowDocument(values);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        reset({
          showId,
          title: "",
          documentType: "Dossier artistique",
          status: "Pret",
          fileUrl: "",
          notes: "",
        });
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" value={showId} {...register("showId")} />
      <Field label="Titre" error={errors.title?.message}>
        <Input placeholder="Dossier artistique 2026" {...register("title")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" error={errors.documentType?.message}>
          <Select {...register("documentType")}>
            {showDocumentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            {showDocumentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Lien du fichier" error={errors.fileUrl?.message}>
        <Input placeholder="https://drive... ou futur fichier TaDiff" type="url" {...register("fileUrl")} />
      </Field>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea placeholder="Version, pieces a revoir, usage subvention..." {...register("notes")} />
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
        Ajouter au dossier
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
