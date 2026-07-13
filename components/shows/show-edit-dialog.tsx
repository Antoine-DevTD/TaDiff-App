"use client";

import { useState } from "react";
import { deleteShow } from "@/app/(dashboard)/actions";
import { DocumentDropzone } from "@/components/documents/document-dropzone";
import { ShowForm } from "@/components/forms/show-form";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Dialog } from "@/components/ui/dialog";
import type { Show } from "@/types";

export function ShowEditDialog({
  show,
  label = "Modifier",
}: {
  show: Show;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Fiche spectacle"
        title={`Modifier ${show.title}`}
        description="Informations, documents du dossier et suppression."
      >
        <div className="space-y-8">
          <section>
            <ShowForm show={show} onSuccess={() => setOpen(false)} />
          </section>

          <section className="border-t border-border pt-6">
            <h4 className="text-base font-semibold">Documents du dossier</h4>
            <p className="mt-1 mb-4 text-sm text-muted">
              Déposez les pièces du spectacle : le type est reconnu automatiquement et le nom est
              normalisé ({show.title.toUpperCase()}_TYPE_DATE).
            </p>
            <DocumentDropzone showId={show.id} showTitle={show.title} />
          </section>

          <section className="border-t border-danger/25 pt-6">
            <h4 className="text-base font-semibold">Supprimer le spectacle</h4>
            <p className="mt-1 mb-4 text-sm text-muted">
              Les documents liés et leurs fichiers stockés seront supprimés. Les dates de
              dates possibles et devis existants seront detaches mais conserves.
            </p>
            <ConfirmDeleteButton
              action={deleteShow.bind(null, show.id)}
              label="Supprimer ce spectacle"
              redirectTo="/shows"
            />
          </section>
        </div>
      </Dialog>
    </>
  );
}
