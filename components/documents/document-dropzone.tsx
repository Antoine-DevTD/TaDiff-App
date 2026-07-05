"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShowDocument, prepareDocumentUpload } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  detectDocumentType,
  extractPdfFirstPageText,
  suggestDocumentTitle,
} from "@/lib/documents-detect";
import { documentAcceptAttribute, getDocumentFileError } from "@/lib/documents-upload";
import { showDocumentStatuses, showDocumentTypes } from "@/lib/show-documents";
import { cn } from "@/lib/utils";
import type { ShowDocumentStatus, ShowDocumentType } from "@/types";

type PendingDoc = {
  id: string;
  file: File;
  title: string;
  documentType: ShowDocumentType;
  status: ShowDocumentStatus;
  error: string | null;
};

export function DocumentDropzone({
  showId,
  onUploaded,
}: {
  showId: string;
  onUploaded?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, setPending] = useState<PendingDoc[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isUploading, startTransition] = useTransition();

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);

    for (const file of list) {
      const error = getDocumentFileError(file);
      const id = `${file.name}-${file.size}-${crypto.randomUUID()}`;

      // Detection immediate sur le nom, puis affinage async avec le contenu PDF.
      setPending((current) => [
        ...current,
        {
          id,
          file,
          title: suggestDocumentTitle(file.name),
          documentType: detectDocumentType(file.name),
          status: "Pret",
          error,
        },
      ]);

      if (!error && file.type === "application/pdf") {
        void extractPdfFirstPageText(file).then((text) => {
          if (!text) return;
          const refined = detectDocumentType(file.name, text);
          setPending((current) =>
            current.map((item) =>
              item.id === id ? { ...item, documentType: refined } : item,
            ),
          );
        });
      }
    }
  }

  function updateDoc(id: string, patch: Partial<PendingDoc>) {
    setPending((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeDoc(id: string) {
    setPending((current) => current.filter((item) => item.id !== id));
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void addFiles(event.dataTransfer.files);
    }
  }

  function onUploadAll() {
    const ready = pending.filter((item) => !item.error);
    if (ready.length === 0) return;

    startTransition(async () => {
      setMessage(null);
      let success = 0;

      for (const item of ready) {
        const prepared = await prepareDocumentUpload({
          showId,
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type,
        });

        if (!prepared.ok || !prepared.signedUrl || !prepared.storagePath) {
          setMessage({ ok: false, text: prepared.message });
          continue;
        }

        const uploadResponse = await fetch(prepared.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });

        if (!uploadResponse.ok) {
          setMessage({ ok: false, text: `Envoi de "${item.file.name}" echoue.` });
          continue;
        }

        const result = await createShowDocument({
          showId,
          title: item.title || suggestDocumentTitle(item.file.name) || item.file.name,
          documentType: item.documentType,
          status: item.status,
          fileUrl: "",
          notes: "",
          storagePath: prepared.storagePath,
        });

        if (result.ok) {
          success += 1;
        } else {
          setMessage({ ok: false, text: result.message });
        }
      }

      if (success > 0) {
        setPending((current) => current.filter((item) => item.error));
        setMessage({ ok: true, text: `${success} document(s) ajoute(s) au dossier.` });
        router.refresh();
        onUploaded?.();
      }
    });
  }

  const readyCount = pending.filter((item) => !item.error).length;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition",
          isDragging ? "border-accent bg-accent/5" : "border-border bg-panel-strong/40",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <p className="text-sm font-medium text-foreground">
          Glissez-deposez vos documents ici
        </p>
        <p className="mt-1 text-xs text-muted">
          Le type est detecte automatiquement (affiche, note d&apos;intention, budget...). PDF,
          image, Word, Excel - 20 Mo max.
        </p>
        <Button
          className="mt-3"
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          Parcourir
        </Button>
        <input
          ref={inputRef}
          accept={documentAcceptAttribute}
          className="hidden"
          multiple
          type="file"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="space-y-3">
          {pending.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-panel-strong/45 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.file.name}</p>
                <button
                  className="text-xs font-medium text-danger hover:underline"
                  type="button"
                  onClick={() => removeDoc(item.id)}
                >
                  Retirer
                </button>
              </div>

              {item.error ? (
                <p className="mt-2 text-xs text-danger">{item.error}</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-medium text-muted sm:col-span-1">
                    Titre
                    <Input
                      className="mt-1"
                      value={item.title}
                      onChange={(event) => updateDoc(item.id, { title: event.target.value })}
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    Type (detecte)
                    <Select
                      className="mt-1"
                      value={item.documentType}
                      onChange={(event) =>
                        updateDoc(item.id, {
                          documentType: event.target.value as ShowDocumentType,
                        })
                      }
                    >
                      {showDocumentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    Statut
                    <Select
                      className="mt-1"
                      value={item.status}
                      onChange={(event) =>
                        updateDoc(item.id, {
                          status: event.target.value as ShowDocumentStatus,
                        })
                      }
                    >
                      {showDocumentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>
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

      {readyCount > 0 ? (
        <Button type="button" disabled={isUploading} onClick={onUploadAll}>
          {isUploading ? "Envoi en cours..." : `Ajouter ${readyCount} document(s) au dossier`}
        </Button>
      ) : null}
    </div>
  );
}
