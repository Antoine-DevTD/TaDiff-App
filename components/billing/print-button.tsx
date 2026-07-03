"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="no-print" type="button" onClick={() => window.print()}>
      Imprimer
    </Button>
  );
}
