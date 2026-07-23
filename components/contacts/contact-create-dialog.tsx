"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ContactCreateDialog({
  buttonLabel = "Ajouter un contact",
}: {
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" aria-hidden />
        {buttonLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Carnet de contacts"
        title="Nouveau contact"
        description="Ajoutez une structure, son rôle et ses tags sans quitter le carnet."
        className="max-w-2xl"
      >
        <ContactForm onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
