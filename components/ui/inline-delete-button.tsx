"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteAction = () => Promise<{ ok: boolean; message: string }>;

export function InlineDeleteButton({
  action,
  label = "Supprimer",
}: {
  action: DeleteAction;
  label?: string;
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

      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="text-sm font-medium text-danger/80 transition hover:text-danger disabled:opacity-50"
        disabled={isPending}
        type="button"
        onClick={onClick}
        onBlur={() => setConfirming(false)}
      >
        {isPending ? "Suppression..." : confirming ? "Confirmer" : label}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
