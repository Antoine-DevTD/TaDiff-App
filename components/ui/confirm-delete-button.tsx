"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type DeleteAction = () => Promise<{ ok: boolean; message: string }>;

export function ConfirmDeleteButton({
  action,
  confirmLabel = "Confirmer la suppression",
  label = "Supprimer",
  redirectTo,
}: {
  action: DeleteAction;
  confirmLabel?: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await action();

      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        className="border-danger/40 text-danger hover:border-danger hover:bg-danger/10"
        disabled={isPending}
        type="button"
        variant="secondary"
        onClick={onClick}
        onBlur={() => setConfirming(false)}
      >
        {isPending ? "Suppression..." : confirming ? confirmLabel : label}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
