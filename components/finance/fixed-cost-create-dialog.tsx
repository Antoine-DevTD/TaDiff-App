"use client";

import { useState } from "react";
import { FixedCostForm } from "@/components/finance/fixed-cost-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function FixedCostCreateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Ajouter un frais fixe
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Finances"
        title="Ajouter un frais fixe"
        description="Assurance, banque, comptable, stockage et outils a lisser dans les prix."
      >
        <FixedCostForm onSaved={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
