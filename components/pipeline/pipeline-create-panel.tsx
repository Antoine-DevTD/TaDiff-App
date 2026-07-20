"use client";

import { useEffect, useState } from "react";
import { OpportunityForm } from "@/components/pipeline/opportunity-form";
import { Dialog } from "@/components/ui/dialog";
import { pipelineCreateEvent } from "@/lib/constants";
import type { Contact, Show } from "@/types";

export function PipelineCreatePanel({
  contacts,
  shows,
}: {
  contacts: Contact[];
  shows: Show[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function openDialog() {
      setIsOpen(true);
    }

    window.addEventListener(pipelineCreateEvent, openDialog);
    return () => window.removeEventListener(pipelineCreateEvent, openDialog);
  }, []);

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      eyebrow="Diffusion"
      title="Ajouter une diffusion"
      description="Cession, coréalisation ou location : choisissez le montage réel, TaDiff adapte la suite."
      className="max-w-4xl"
    >
      <OpportunityForm
        contacts={contacts}
        shows={shows}
        onSuccess={() => setIsOpen(false)}
      />
    </Dialog>
  );
}
