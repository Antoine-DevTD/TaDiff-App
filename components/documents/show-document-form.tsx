"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createShowDocument, prepareDocumentUpload } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { documentAcceptAttribute, getDocumentFileError } from "@/lib/documents-upload";
import {
  getShowDocumentTypeLabel,
  showDocumentStatuses,
  showDocumentTypes,
} from "@/lib/show-documents";
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
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
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

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    const error = getDocumentFileError(file);
    setFileError(error);
    setSelectedFile(error ? null : file);
  }

  function clearForm() {
    reset({
      showId,
      title: "",
      documentType: "Dossier artistique",
      status: "Pret",
      fileUrl: "",
      notes: "",
    });
    setSelectedFile(null);
    setFileError(null);
    setFileInputKey((key) => key + 1);
  }

  function onSubmit(values: ShowDocumentFormValues) {
    startTransition(async () => {
      setMessage(null);
      let storagePath: string | undefined;

      if (selectedFile) {
        const prepared = await prepareDocumentUpload({
          showId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        });

        if (!prepared.ok || !prepared.signedUrl || !prepared.storagePath) {
          setMessage({ ok: false, text: prepared.message });
          return;
        }

        const uploadResponse = await fetch(prepared.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!uploadResponse.ok) {
          setMessage({
            ok: false,
            text: "L'envoi du fichier a échoué. Réessayez ou utilisez un lien externe.",
          });
          return;
        }

        storagePath = prepared.storagePath;
      }

      const result = await createShowDocument({ ...values, storagePath });
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        clearForm();
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
                {getShowDocumentTypeLabel(type)}
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

      <Field label="Fichier (PDF, image, Word, Excel - 20 Mo max)" error={fileError ?? undefined}>
        <input
          key={fileInputKey}
          accept={documentAcceptAttribute}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-panel-strong file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:border-accent/40"
          type="file"
          onChange={onFileChange}
        />
      </Field>

      <Field label="Ou lien externe (Drive, site...)" error={errors.fileUrl?.message}>
        <Input placeholder="https://drive.google.com/..." type="url" {...register("fileUrl")} />
      </Field>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea placeholder="Version, pièces à revoir, usage subvention..." {...register("notes")} />
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

      <Button type="submit" disabled={isSubmitting || isPending || Boolean(fileError)}>
        {isPending
          ? selectedFile
            ? "Envoi du fichier..."
            : "Ajout..."
          : "Ajouter au dossier"}
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
