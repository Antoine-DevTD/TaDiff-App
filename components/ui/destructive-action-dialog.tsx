"use client";

import { AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";

type DestructiveAction = () => Promise<{ ok: boolean; message: string }>;

export function DestructiveActionDialog({
  action,
  description,
  eyebrow = "Suppression",
  holdLabel = "Maintenir 3 secondes pour supprimer",
  open,
  title,
  warning,
  onClose,
  onSuccess,
}: {
  action: DestructiveAction;
  description: string;
  eyebrow?: string;
  holdLabel?: string;
  open: boolean;
  title: string;
  warning?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (isPending) return;
    setError(null);
    onClose();
  }

  function confirm() {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSuccess?.();
      onClose();
    });
  }

  return (
    <Dialog
      className="max-w-lg"
      description={description}
      eyebrow={eyebrow}
      open={open}
      title={title}
      onClose={close}
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-md border border-danger/20 bg-danger/6 p-4 text-sm leading-6 text-muted">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p>{warning ?? "Cette suppression est definitive. Les elements lies pourront etre detaches."}</p>
        </div>
        <div>
          <HoldToConfirmButton label={holdLabel} pending={isPending} onConfirm={confirm} />
          <p className="mt-2 text-xs text-muted">Relachez avant la fin pour annuler.</p>
        </div>
        {error ? <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      </div>
    </Dialog>
  );
}
