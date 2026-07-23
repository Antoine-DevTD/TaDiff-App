"use client";

import { Download, FileUp, Folder, FolderPlus, History, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createShowWorkDocument,
  createShowWorkFolder,
  deleteShowWorkDocument,
  prepareDocumentUpload,
  replaceShowWorkDocument,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDocumentFileError } from "@/lib/documents-upload";
import { cn } from "@/lib/utils";
import type { ShowWorkDocument, ShowWorkFolder } from "@/types";

export function ShowWorkspaceDocuments({
  documents,
  folders,
  showId,
}: {
  documents: ShowWorkDocument[];
  folders: ShowWorkFolder[];
  showId: string;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const visibleDocuments = documents.filter((document) => document.folderId === folderId);

  function createFolder() {
    if (!folderName.trim()) return;
    startTransition(async () => {
      const result = await createShowWorkFolder(showId, folderName, null);
      setMessage(result.message);
      if (result.ok) { setFolderName(""); router.refresh(); }
    });
  }

  async function uploadFile(file: File, replace?: ShowWorkDocument) {
    const error = getDocumentFileError(file);
    if (error) { setMessage(error); return; }
    const prepared = await prepareDocumentUpload({ showId, fileName: file.name, fileSize: file.size, fileType: file.type });
    if (!prepared.ok || !prepared.signedUrl || !prepared.storagePath) { setMessage(prepared.message); return; }
    const response = await fetch(prepared.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) { setMessage("L'envoi du fichier a echoue."); return; }
    const result = replace
      ? await replaceShowWorkDocument(replace.id, { showId, storagePath: prepared.storagePath, mimeType: file.type, fileSize: file.size })
      : await createShowWorkDocument({ showId, folderId, title: file.name.replace(/\.[^.]+$/, ""), storagePath: prepared.storagePath, mimeType: file.type, fileSize: file.size });
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  function remove(document: ShowWorkDocument) {
    if (!window.confirm(`Supprimer ${document.title} et toutes ses versions ?`)) return;
    startTransition(async () => {
      const result = await deleteShowWorkDocument(document.id, showId);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3 border-r border-border pr-4">
        <button className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm", folderId === null && "bg-accent/10 text-accent")} onClick={() => setFolderId(null)} type="button">
          <Folder className="h-4 w-4" /> Tous les documents
        </button>
        {folders.map((folder) => (
          <button key={folder.id} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm", folderId === folder.id && "bg-accent/10 text-accent")} onClick={() => setFolderId(folder.id)} type="button">
            <Folder className="h-4 w-4" /> <span className="truncate">{folder.name}</span>
          </button>
        ))}
        <div className="flex gap-2 pt-2">
          <Input aria-label="Nom du nouveau dossier" placeholder="Nouveau dossier" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
          <Button aria-label="Créer le dossier" className="h-10 min-h-10 w-10 px-0" disabled={isPending || !folderName.trim()} onClick={createFolder} type="button"><FolderPlus className="h-4 w-4" /></Button>
        </div>
      </aside>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{folderId ? folders.find((folder) => folder.id === folderId)?.name : "Documents du projet"}</h3>
            <p className="text-sm text-muted">Contrats, feuilles de paie, tableaux de travail et documents internes.</p>
          </div>
          <Button className="gap-2" disabled={isPending} onClick={() => uploadRef.current?.click()} type="button">
            <FileUp className="h-4 w-4" /> Ajouter un fichier
          </Button>
          <input ref={uploadRef} className="hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) startTransition(() => uploadFile(file)); event.target.value = ""; }} />
        </div>
        {visibleDocuments.length === 0 ? (
          <button className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted hover:border-accent/50 hover:text-foreground" onClick={() => uploadRef.current?.click()} type="button">
            <FileUp className="h-5 w-5" /> Déposer le premier fichier ici
          </button>
        ) : visibleDocuments.map((document) => (
          <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-2 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{document.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted"><History className="h-3.5 w-3.5" /> Version {document.versionNumber} - {Math.max(1, Math.round(document.fileSize / 1024))} Ko</p>
            </div>
            <div className="flex items-center gap-1">
              <a className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-panel-strong" href={document.fileUrl} title="Télécharger"><Download className="h-4 w-4" /></a>
              <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-panel-strong" title="Ajouter une nouvelle version">
                <FileUp className="h-4 w-4" /><input className="hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) startTransition(() => uploadFile(file, document)); event.target.value = ""; }} />
              </label>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-danger hover:bg-danger/10" onClick={() => remove(document)} title="Supprimer" type="button"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </section>
    </div>
  );
}
