"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShowDocument, prepareDocumentUpload } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { buildDocumentTitle, documentAcceptAttribute, getDocumentFileError } from "@/lib/documents-upload";
import {
  getDocumentStatusTone,
  getShowDocumentTypeLabel,
  type ShowOwnedDocumentType,
} from "@/lib/show-documents";
import { cn } from "@/lib/utils";
import type { ShowDocumentStatus } from "@/types";

export function DocumentSlot({
  showId,
  showTitle,
  type,
  title,
  requirementLabel,
  status,
}: {
  showId: string;
  showTitle: string;
  type: ShowOwnedDocumentType;
  title: string | null;
  requirementLabel?: string;
  status: ShowDocumentStatus;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileSelected(file: File) {
    const fileError = getDocumentFileError(file);

    if (fileError) {
      setError(fileError);
      return;
    }

    setError(null);

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
        setError(`Envoi de "${file.name}" echoue.`);
        return;
      }

      const result = await createShowDocument({
        showId,
        title: buildDocumentTitle(showTitle, type),
        documentType: type,
        status: "Pret",
        fileUrl: "",
        notes: "",
        storagePath: prepared.storagePath,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
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
        if (file) onFileSelected(file);
      }}
    >
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-start justify-between gap-2 text-left transition hover:opacity-80 disabled:opacity-60"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{getShowDocumentTypeLabel(type)}</p>
            {requirementLabel ? (
              <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {requirementLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {isUploading ? "Envoi en cours..." : title || "Cliquer pour ajouter"}
          </p>
        </div>
        <Badge tone={getDocumentStatusTone(status)}>{status}</Badge>
      </button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      <input
        ref={inputRef}
        accept={documentAcceptAttribute}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
