"use client";

import { useState } from "react";
import { GrantForm } from "@/components/grants/grant-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Show } from "@/types";

export function GrantCreateDialog({ shows }: { shows: Show[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Ajouter un dispositif
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Radar subventions"
        title="Ajouter un dispositif"
        description="Chaque dispositif suit ses pièces, sa deadline et alimente le calendrier et le cockpit."
      >
        <GrantForm shows={shows} onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
