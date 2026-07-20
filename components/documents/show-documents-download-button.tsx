"use client";

import { useState, useTransition } from "react";
import { Download, LoaderCircle } from "lucide-react";
import {
  createZip,
  fetchDocument,
  sanitizeFilename,
  type ZipEntry,
} from "@/components/grants/grant-dossier-zip-button";
import { getShowDocumentTypeLabel } from "@/lib/show-documents";
import type { ShowDocument } from "@/types";

export function ShowDocumentsDownloadButton({
  documents,
  showTitle,
}: {
  documents: ShowDocument[];
  showTitle: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const availableDocuments = documents.filter((document) => document.fileUrl);

  function downloadAll() {
    startTransition(async () => {
      setError(null);
      const entries: ZipEntry[] = [];

      for (const document of availableDocuments) {
        const fetched = await fetchDocument(document.fileUrl);
        if (!fetched) continue;

        entries.push({
          data: fetched.data,
          name: `${sanitizeFilename(getShowDocumentTypeLabel(document.documentType))}${fetched.extension}`,
        });
      }

      if (entries.length === 0) {
        setError("Aucun fichier n'a pu être téléchargé.");
        return;
      }

      const url = URL.createObjectURL(createZip(entries));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFilename(showTitle)}-dossier.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (availableDocuments.length === 0) return null;

  return (
    <span className="relative inline-flex">
      <button
        aria-label="Télécharger toutes les pièces"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel text-muted transition hover:border-accent/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        disabled={isPending}
        title={error ?? "Télécharger toutes les pièces"}
        type="button"
        onClick={downloadAll}
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {error ? <span className="sr-only" role="alert">{error}</span> : null}
    </span>
  );
}
