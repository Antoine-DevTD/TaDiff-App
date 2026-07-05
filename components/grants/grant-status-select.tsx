"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateGrantStatus } from "@/app/(dashboard)/actions";
import { grantStatuses } from "@/lib/validation/grant";
import type { GrantStatus } from "@/types";

export function GrantStatusSelect({
  grantId,
  status,
}: {
  grantId: string;
  status: GrantStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(nextStatus: GrantStatus) {
    startTransition(async () => {
      setError(null);
      const result = await updateGrantStatus(grantId, nextStatus);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        className="rounded-md border border-border bg-panel px-2 py-1.5 text-sm disabled:opacity-50"
        defaultValue={status}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as GrantStatus)}
      >
        {grantStatuses.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
