"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCompanyDocument,
  deleteCompanyDocument,
  prepareDocumentUpload,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { companyDocumentTypes } from "@/lib/company-documents";
import { documentAcceptAttribute, getDocumentFileError } from "@/lib/documents-upload";
import type { CompanyDocument } from "@/types";

export function CompanyDocumentsPanel({
  documents,
  canManage,
}: {
  documents: CompanyDocument[];
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>(companyDocumentTypes[0]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    if (!file) {
      setMessage({ ok: false, text: "Choisissez un fichier." });
      return;
    }
    const fileError = getDocumentFileError(file);
    if (fileError) {
      setMessage({ ok: false, text: fileError });
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const prepared = await prepareDocumentUpload({
        showId: "company",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      if (!prepared.ok || !prepared.signedUrl || !prepared.storagePath) {
        setMessage({ ok: false, text: prepared.message });
        return;
      }

      const uploadResponse = await fetch(prepared.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        setMessage({ ok: false, text: "L'envoi du fichier a échoué." });
        return;
      }

      const result = await createCompanyDocument({
        title: title.trim() || docType,
        docType,
        storagePath: prepared.storagePath,
        fileUrl: "",
        note: "",
      });

      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setTitle("");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCompanyDocument(id);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  const presentTypes = new Set(documents.map((doc) => doc.docType));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {companyDocumentTypes.map((type) => (
          <Badge key={type} tone={presentTypes.has(type) ? "success" : "neutral"}>
            {presentTypes.has(type) ? `✓ ${type}` : type}
          </Badge>
        ))}
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <Badge tone="info">{doc.docType}</Badge>
                </div>
                <p className="text-xs text-muted">
                  Ajouté le {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {doc.fileUrl ? (
                  <a
                    className="text-sm font-medium text-accent hover:text-accent-strong"
                    href={doc.fileUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Télécharger
                  </a>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-danger hover:underline"
                    disabled={isPending}
                    onClick={() => onDelete(doc.id)}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucun document. Ajoutez vos pièces une fois : elles seront disponibles pour tous les
          dossiers.
        </p>
      )}

      {canManage ? (
        <div className="space-y-3 rounded-lg border border-border bg-panel-strong/25 p-4">
          <p className="text-sm font-semibold">Ajouter une pièce</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted">
              Type
              <Select className="mt-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {companyDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Titre (optionnel)
              <Input
                className="mt-1"
                placeholder={docType}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>
          <input
            ref={inputRef}
            accept={documentAcceptAttribute}
            type="file"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-panel-strong file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:border-accent/40"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" disabled={isPending} onClick={onSubmit}>
            {isPending ? "Envoi..." : "Ajouter le document"}
          </Button>
        </div>
      ) : null}

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
    </div>
  );
}
