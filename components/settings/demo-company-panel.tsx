"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { seedDemoCompany } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DemoCompanyPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    startTransition(async () => {
      setMessage(null);
      const result = await seedDemoCompany();
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-base font-semibold">Compagnie de demonstration</p>
        <p className="mt-1 text-sm text-muted">
          Installe la Compagnie de l&apos;Estran : 3 spectacles, 8 contacts, dates possibles,
          actions, frais fixes, tresorerie, documents, devis et subventions, avec des echeances
          calees sur aujourd&apos;hui. Uniquement sur un espace vierge.
        </p>
      </div>
      <div className="space-y-2">
        <Button disabled={isPending} type="button" variant="secondary" onClick={onClick}>
          {isPending
            ? "Installation..."
            : confirming
              ? "Confirmer l'installation"
              : "Installer la compagnie de demonstration"}
        </Button>
        {message ? (
          <p className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
