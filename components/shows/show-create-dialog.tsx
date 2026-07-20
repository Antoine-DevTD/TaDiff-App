"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShowForm } from "@/components/forms/show-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ShowCreateDialog({
  initialOpen = false,
  label = "Nouveau spectacle",
  showTrigger = true,
  triggerClassName,
}: {
  initialOpen?: boolean;
  label?: string;
  showTrigger?: boolean;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);

  function closeDialog() {
    setOpen(false);
    if (initialOpen) router.replace("/shows", { scroll: false });
  }

  return (
    <>
      {showTrigger && triggerClassName ? (
        <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
          {label}
        </button>
      ) : showTrigger ? (
        <Button className="gap-2" type="button" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {label}
        </Button>
      ) : null}

      <Dialog
        open={open}
        onClose={closeDialog}
        eyebrow="Catalogue"
        title="Nouveau spectacle"
        description="Ajoutez une creation au catalogue des spectacles."
      >
        <ShowForm onSuccess={closeDialog} />
      </Dialog>
    </>
  );
}
