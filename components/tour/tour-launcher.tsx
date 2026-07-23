"use client";

import { Button } from "@/components/ui/button";
import { tourStartEvent } from "@/components/tour/guided-tour";

export function TourLauncher({
  label = "Lancer la visite guidée",
  variant = "secondary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => window.dispatchEvent(new Event(tourStartEvent))}
    >
      {label}
    </Button>
  );
}
