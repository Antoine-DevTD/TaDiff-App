"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type ExplorerDocument = {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  date: string;
};

export type ExplorerFolder = {
  id: string;
  label: string;
  detail?: string;
  href?: string;
  documents: ExplorerDocument[];
};

export function DocumentExplorer({ folders }: { folders: ExplorerFolder[] }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const filteredFolders = useMemo(() => {
    if (!term) return folders;

    return folders
      .map((folder) => ({
        ...folder,
        documents: folder.documents.filter(
          (doc) =>
            doc.title.toLowerCase().includes(term) ||
            doc.type.toLowerCase().includes(term) ||
            folder.label.toLowerCase().includes(term),
        ),
      }))
      .filter((folder) => folder.documents.length > 0);
  }, [folders, term]);

  const totalDocuments = folders.reduce((total, folder) => total + folder.documents.length, 0);

  if (totalDocuments === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
        Aucun document importé pour le moment. Les fichiers ajoutés depuis une fiche spectacle ou
        les paramètres apparaîtront ici, classés par dossier.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher un document, un type, un spectacle..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-xs text-muted">{totalDocuments} document(s) au total</p>
      </div>

      {filteredFolders.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
          Aucun document ne correspond à la recherche.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFolders.map((folder) => (
            <details
              key={folder.id}
              open={Boolean(term)}
              className="rounded-md border border-border bg-panel-strong/35"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate">{folder.label}</span>
                  {folder.detail ? (
                    <span className="truncate text-xs font-normal text-muted">{folder.detail}</span>
                  ) : null}
                </span>
                <Badge tone="neutral">{folder.documents.length}</Badge>
              </summary>
              <div className="space-y-2 border-t border-border p-3">
                {folder.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted">
                        {doc.type} - {new Date(doc.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {doc.fileUrl ? (
                      <a
                        className="shrink-0 text-sm font-medium text-accent hover:text-accent-strong"
                        href={doc.fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Télécharger
                      </a>
                    ) : null}
                  </div>
                ))}
                {folder.href ? (
                  <Link
                    className="inline-block text-sm font-medium text-accent hover:text-accent-strong"
                    href={folder.href}
                  >
                    Ouvrir la fiche →
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
