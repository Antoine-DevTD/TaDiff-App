"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePatronageStatus } from "@/app/(dashboard)/actions";
import { patronageStatuses } from "@/lib/validation/patronage";
import type { PatronageStatus } from "@/types";

export function PatronageStatusSelect({
  dealId,
  status,
}: {
  dealId: string;
  status: PatronageStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(nextStatus: PatronageStatus) {
    startTransition(async () => {
      setError(null);
      const result = await updatePatronageStatus(dealId, nextStatus);

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
        onChange={(event) => onChange(event.target.value as PatronageStatus)}
      >
        {patronageStatuses.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
