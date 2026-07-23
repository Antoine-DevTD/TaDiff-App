"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCompanyDocument,
  createShowDocument,
  prepareDocumentUpload,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { buildDocumentTitle, documentAcceptAttribute, getDocumentFileError } from "@/lib/documents-upload";
import {
  getRequirementLabel,
  getRequirementTone,
  isCompanyGrantDocumentType,
  type GrantRequirementState,
} from "@/lib/grants";
import { getShowDocumentTypeLabel } from "@/lib/show-documents";
import { cn } from "@/lib/utils";

export function GrantRequirementSlot({
  requirement,
  showId,
  showTitle,
}: {
  requirement: GrantRequirementState;
  showId?: string;
  showTitle?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startTransition] = useTransition();
  const companyDocument = isCompanyGrantDocumentType(requirement.type);
  const canUpload = companyDocument || Boolean(showId && showTitle);

  function onFileSelected(file: File) {
    const fileError = getDocumentFileError(file);

    if (fileError) {
      setError(fileError);
      return;
    }

    setError(null);
    startTransition(async () => {
      const targetId = companyDocument ? "company" : showId;

      if (!targetId) {
        setError("Associez d'abord un spectacle a cette subvention.");
        return;
      }

      const prepared = await prepareDocumentUpload({
        showId: targetId,
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

      const result = isCompanyGrantDocumentType(requirement.type)
        ? await createCompanyDocument({
            title: requirement.type,
            docType: requirement.type,
            storagePath: prepared.storagePath,
            fileUrl: "",
            note: "",
          })
        : await createShowDocument({
            showId: targetId,
            title: buildDocumentTitle(showTitle ?? "Spectacle", requirement.type),
            documentType: requirement.type,
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
        "rounded-md border border-dashed border-border bg-panel p-3 transition",
        isDragging && "border-accent bg-accent/5",
      )}
      onDragOver={(event) => {
        if (!canUpload) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (!canUpload) return;
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFileSelected(file);
      }}
    >
      <button
        className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canUpload || isUploading}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{getShowDocumentTypeLabel(requirement.type)}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {isUploading
              ? "Envoi en cours..."
              : requirement.document?.title ||
                (canUpload ? "Cliquer ou déposer le fichier" : "Associer un spectacle pour ajouter")}
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {companyDocument ? "Document compagnie" : "Document spectacle"}
          </span>
        </span>
        <Badge tone={getRequirementTone(requirement.status)}>
          {getRequirementLabel(requirement.status)}
        </Badge>
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
