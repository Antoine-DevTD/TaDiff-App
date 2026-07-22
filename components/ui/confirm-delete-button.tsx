"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";

type DeleteAction = () => Promise<{ ok: boolean; message: string }>;

export function ConfirmDeleteButton({
  action,
  label = "Supprimer",
  redirectTo,
}: {
  action: DeleteAction;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    startTransition(async () => {
      setError(null);
      const result = await action();

      if (!result.ok) {
        setError(result.message);
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
      <HoldToConfirmButton label={`Maintenir 3 secondes : ${label}`} pending={isPending} onConfirm={confirm} />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
