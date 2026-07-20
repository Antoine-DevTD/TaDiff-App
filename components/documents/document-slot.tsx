"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Upload } from "lucide-react";
import {
  createShowDocument,
  prepareDocumentUpload,
  replaceShowDocument,
} from "@/app/(dashboard)/actions";
import { ShowDocumentDeleteButton } from "@/components/documents/show-document-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  buildDocumentTitle,
  documentAcceptAttribute,
  getDocumentFileError,
} from "@/lib/documents-upload";
import {
  getDocumentStatusLabel,
  getDocumentStatusTone,
  getShowDocumentTypeLabel,
  type ShowOwnedDocumentType,
} from "@/lib/show-documents";
import { cn } from "@/lib/utils";
import type { ShowDocumentStatus } from "@/types";

type DocumentSlotProps = {
  documentId?: string;
  fileUrl?: string;
  previewUrl?: string;
  showId: string;
  showTitle: string;
  status: ShowDocumentStatus;
  title: string | null;
  type: ShowOwnedDocumentType;
};

export function DocumentSlot({
  documentId,
  fileUrl,
  previewUrl,
  showId,
  showTitle,
  status,
  title,
  type,
}: DocumentSlotProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typeLabel = getShowDocumentTypeLabel(type);

  function selectFile(file: File) {
    const fileError = getDocumentFileError(file);

    if (fileError) {
      setError(fileError);
      return;
    }

    setError(null);

    if (documentId) {
      setReplacementFile(file);
      return;
    }

    uploadFile(file);
  }

  function uploadFile(file: File) {
    startTransition(async () => {
      const prepared = await prepareDocumentUpload({
        showId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      if (!prepared.ok || !prepared.signedUrl || !prepared.storagePath) {
        setError(prepared.message);
        return;
      }

      const uploadResponse = await fetch(prepared.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        setError(`Envoi de "${file.name}" échoué.`);
        return;
      }

      const values = {
        showId,
        title: buildDocumentTitle(showTitle, type),
        documentType: type,
        status: "Pret" as const,
        fileUrl: "",
        notes: "",
        storagePath: prepared.storagePath,
      };
      const result = documentId
        ? await replaceShowDocument(documentId, values)
        : await createShowDocument(values);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setReplacementFile(null);
      router.refresh();
    });
  }

  return (
    <>
      <div
        className={cn(
          "rounded-md border border-dashed border-border bg-panel-strong/45 p-3 transition",
          isDragging && "border-accent bg-accent/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) selectFile(file);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="min-w-0 flex-1 text-left transition hover:opacity-75 disabled:opacity-60"
            title={documentId ? `Déposer une nouvelle version de ${typeLabel}` : `Ajouter ${typeLabel}`}
          >
            <span className="block text-sm font-medium">{typeLabel}</span>
            <span className="mt-0.5 block break-words text-xs leading-5 text-muted">
              {isUploading ? "Envoi en cours..." : title || "Cliquer ou déposer un fichier"}
            </span>
          </button>

          <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1 self-end sm:self-auto">
            <Badge tone={getDocumentStatusTone(status)}>
              {getDocumentStatusLabel(status)}
            </Badge>
            {previewUrl || fileUrl ? (
              <a
                aria-label={`Visualiser ${typeLabel}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                href={previewUrl || fileUrl}
                rel="noreferrer"
                target="_blank"
                title={`Visualiser ${typeLabel}`}
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
            {fileUrl ? (
              <a
                aria-label={`Télécharger ${typeLabel}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                href={fileUrl}
                title={`Télécharger ${typeLabel}`}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
            {documentId ? (
              <ShowDocumentDeleteButton compact documentId={documentId} />
            ) : (
              <button
                aria-label={`Ajouter ${typeLabel}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                disabled={isUploading}
                title={`Ajouter ${typeLabel}`}
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        <input
          ref={inputRef}
          accept={documentAcceptAttribute}
          aria-label={documentId ? `Nouvelle version de ${typeLabel}` : `Ajouter ${typeLabel}`}
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) selectFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <Dialog
        className="max-w-lg"
        description="La version actuelle sera remplacée. Cette action ne sera effectuée qu'après l'envoi réussi du nouveau fichier."
        open={Boolean(replacementFile)}
        title={`Remplacer ${typeLabel} ?`}
        onClose={() => setReplacementFile(null)}
      >
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-panel-strong/45 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Nouveau fichier</p>
            <p className="mt-1 truncate text-sm font-medium">{replacementFile?.name}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setReplacementFile(null)}>
              Annuler
            </Button>
            <Button
              disabled={isUploading || !replacementFile}
              type="button"
              onClick={() => replacementFile && uploadFile(replacementFile)}
            >
              {isUploading ? "Remplacement..." : "Confirmer le remplacement"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
