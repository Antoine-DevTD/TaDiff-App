"use client";

import { ShowForm } from "@/components/forms/show-form";
import { Dialog } from "@/components/ui/dialog";

export function AccountShowDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="Catalogue"
      title="Nouveau spectacle"
      description="Ajoutez une création au catalogue des spectacles."
    >
      <ShowForm onSuccess={onClose} />
    </Dialog>
  );
}
