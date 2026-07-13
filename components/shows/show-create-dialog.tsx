"use client";

import { useState } from "react";
import { ShowForm } from "@/components/forms/show-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ShowCreateDialog({
  label = "Nouveau spectacle",
  triggerClassName,
}: {
  label?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {triggerClassName ? (
        <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
          {label}
        </button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Catalogue"
        title="Nouveau spectacle"
        description="Ajoutez une creation au catalogue des spectacles."
      >
        <ShowForm onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
