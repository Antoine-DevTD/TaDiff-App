"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type WorkspaceExportPanelProps = {
  backup: Record<string, unknown>;
};

export function WorkspaceExportPanel({ backup }: WorkspaceExportPanelProps) {
  const [message, setMessage] = useState("");

  function downloadBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      format: "tadiff-workspace-export-v1",
      ...backup,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `tadiff-sauvegarde-${date}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Sauvegarde exportee.");
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-base font-semibold">Sauvegarde</p>
        <p className="mt-1 text-sm text-muted">
          Export JSON des données visibles du workspace : spectacles, contacts, diffusion, relances,
          devis, subventions, mecenat et campagnes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={downloadBackup}>
          Exporter une sauvegarde
        </Button>
        <Button type="button" variant="secondary" disabled>
          Import a securiser
        </Button>
      </div>
      {message ? <p className="text-sm text-success">{message}</p> : null}
    </Card>
  );
}
