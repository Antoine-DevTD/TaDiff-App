"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteShowDocument } from "@/app/(dashboard)/actions";
import { cn } from "@/lib/utils";

export function ShowDocumentDeleteButton({
  compact = false,
  documentId,
}: {
  compact?: boolean;
  documentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deleteShowDocument(documentId);

      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }

      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        aria-label={confirming ? "Confirmer la suppression" : "Supprimer le document"}
        className={cn(
          "text-sm font-medium text-danger/80 transition hover:text-danger disabled:opacity-50",
          compact && "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-danger/10",
          confirming && compact && "bg-danger/10 text-danger",
        )}
        disabled={isPending}
        title={confirming ? "Cliquer à nouveau pour confirmer" : "Supprimer le document"}
        type="button"
        onClick={onDelete}
        onBlur={() => setConfirming(false)}
      >
        {compact ? (
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        ) : isPending ? (
          "Suppression..."
        ) : confirming ? (
          "Confirmer la suppression"
        ) : (
          "Supprimer"
        )}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
