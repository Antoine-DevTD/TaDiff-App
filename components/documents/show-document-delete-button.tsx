"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteShowDocument } from "@/app/(dashboard)/actions";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";
import { cn } from "@/lib/utils";

export function ShowDocumentDeleteButton({
  compact = false,
  documentId,
}: {
  compact?: boolean;
  documentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Supprimer le document"
        className={cn(
          "text-sm font-medium text-danger/80 transition hover:text-danger",
          compact && "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-danger/10",
        )}
        title="Supprimer le document"
        type="button"
        onClick={() => setOpen(true)}
      >
        {compact ? <Trash2 aria-hidden="true" className="h-4 w-4" /> : "Supprimer"}
      </button>
      <DestructiveActionDialog
        action={deleteShowDocument.bind(null, documentId)}
        description="Ce fichier et ses versions vont etre retires du dossier du spectacle."
        holdLabel="Maintenir 3 secondes pour supprimer le document"
        open={open}
        title="Supprimer ce document ?"
        warning="Cette suppression est definitive. Verifiez qu'aucune version de ce document ne doit etre conservee."
        onClose={() => setOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
