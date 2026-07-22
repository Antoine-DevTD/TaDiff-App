"use client";

import { useState, useTransition } from "react";
import { updateGrantShow } from "@/app/(dashboard)/actions";
import { Select } from "@/components/ui/select";

export function GrantShowSelect({
  grantId,
  initialShowId,
  shows,
}: {
  grantId: string;
  initialShowId: string;
  shows: Array<{ id: string; title: string }>;
}) {
  const [value, setValue] = useState(initialShowId);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-w-[13rem]">
      <Select
        aria-label="Spectacle concerné"
        className="min-h-9 text-sm"
        disabled={isPending}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const previousValue = value;
          setValue(nextValue);
          setMessage(null);
          startTransition(async () => {
            const result = await updateGrantShow(grantId, nextValue);
            if (!result.ok) {
              setValue(previousValue);
              setMessage(result.message);
            }
          });
        }}
      >
        <option value="">Aide générale à la compagnie</option>
        {shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
      </Select>
      {message ? <p className="mt-1 text-xs text-danger">{message}</p> : null}
    </div>
  );
}
