"use client";

import { Download, Eye } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classifyShowDocument } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getShowDocumentTypeLabel, showDocumentTypes } from "@/lib/show-documents";
import type { ShowDocument } from "@/types";

export function UnclassifiedDocuments({ documents, showId }: { documents: ShowDocument[]; showId: string }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  if (documents.length === 0) return null;
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <div><h3 className="font-semibold">A renseigner</h3><p className="mt-1 text-sm text-muted">TaDiff n&apos;a pas reconnu ces fichiers. Indiquez leur type pour les ranger au bon endroit.</p></div>
      {documents.map((document) => (
        <div key={document.id} className="flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.title}</p><p className="text-xs text-muted">Type a renseigner</p></div>
          <Select className="w-48" value={choices[document.id] ?? ""} onChange={(event) => setChoices((current) => ({ ...current, [document.id]: event.target.value }))}>
            <option value="">Choisir le type</option>
            {showDocumentTypes.filter((type) => type !== "A renseigner").map((type) => <option key={type} value={type}>{getShowDocumentTypeLabel(type)}</option>)}
          </Select>
          {document.previewUrl ? <a aria-label="Visualiser" href={document.previewUrl} rel="noreferrer" target="_blank"><Eye className="h-4 w-4" /></a> : null}
          {document.fileUrl ? <a aria-label="Telecharger" href={document.fileUrl}><Download className="h-4 w-4" /></a> : null}
          <Button disabled={isPending || !choices[document.id]} type="button" onClick={() => startTransition(async () => { const result = await classifyShowDocument(document.id, showId, choices[document.id]); if (result.ok) router.refresh(); })}>Ranger</Button>
        </div>
      ))}
    </section>
  );
}
