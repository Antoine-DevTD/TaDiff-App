"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importReferenceGrants } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";

export function GrantImportButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onClick() {
    startTransition(async () => {
      setMessage(null);
      const result = await importReferenceGrants();
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button disabled={isPending} type="button" variant="secondary" onClick={onClick}>
        {isPending ? "Import..." : "Importer 10 dispositifs de référence"}
      </Button>
      {message ? (
        <p className={message.ok ? "text-xs text-success" : "text-xs text-danger"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
