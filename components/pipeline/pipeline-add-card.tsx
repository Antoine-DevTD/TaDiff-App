"use client";

import { Plus } from "lucide-react";
import { pipelineCreateEvent } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PipelineAddCard({ variant = "card" }: { variant?: "card" | "empty" }) {
  function openCreateDialog() {
    window.dispatchEvent(new Event(pipelineCreateEvent));
  }

  return (
    <button
      className={cn(
        "group flex w-full flex-col items-center justify-center border border-dashed border-accent/35 bg-panel/55 text-center transition hover:border-accent hover:bg-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variant === "empty" ? "min-h-40 rounded-lg p-8" : "min-h-36 rounded-md p-4",
      )}
      type="button"
      onClick={openCreateDialog}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent transition group-hover:scale-105 group-hover:bg-accent group-hover:text-white motion-reduce:transform-none">
        <Plus aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className={cn("font-semibold", variant === "empty" ? "mt-4" : "mt-3 text-sm")}>
        {variant === "empty" ? "Ajouter votre première diffusion" : "Ajouter une diffusion"}
      </span>
      {variant === "empty" ? (
        <span className="mt-2 max-w-md text-sm text-muted">
          Reliez un spectacle à un contact et choisissez le mode d&apos;exploitation.
        </span>
      ) : null}
    </button>
  );
}
