"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminSetMaintenanceMode } from "@/app/(dashboard)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MaintenanceToggle({ active }: { active: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle() {
    const next = !active;
    const confirmed = window.confirm(
      next
        ? "Activer le mode maintenance ? Le site devient inaccessible pour tous les visiteurs (sauf bascule d'urgence IP/token)."
        : "Desactiver le mode maintenance et rouvrir le site a tous les visiteurs ?",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await adminSetMaintenanceMode(next);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone={active ? "danger" : "success"}>
        {active ? "Maintenance active" : "Site ouvert"}
      </Badge>
      <Button type="button" variant="secondary" disabled={isPending} onClick={toggle}>
        {isPending ? "..." : active ? "Desactiver la maintenance" : "Activer la maintenance"}
      </Button>
      {message ? (
        <p className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
